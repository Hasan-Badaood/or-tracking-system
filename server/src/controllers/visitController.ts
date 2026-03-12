import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Visit, Patient, Stage, ORRoom, User, FamilyContact } from '../models';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Helper function to generate visit tracking ID
const generateVisitTrackingId = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `VT-${year}${month}${day}`;

  // Find the highest sequential number for today
  const todayVisits = await Visit.findAll({
    where: {
      visit_tracking_id: {
        [Op.like]: `${datePrefix}-%`
      }
    },
    order: [['visit_tracking_id', 'DESC']],
    limit: 1
  });

  let sequence = 1;
  if (todayVisits.length > 0) {
    const lastId = todayVisits[0].visit_tracking_id;
    const lastSequence = parseInt(lastId.split('-')[2], 10);
    sequence = lastSequence + 1;
  }

  const sequenceStr = String(sequence).padStart(3, '0');
  return `${datePrefix}-${sequenceStr}`;
};

// GET /visits - List visits with filtering and pagination
export const getVisits = async (req: Request, res: Response) => {
  try {
    const {
      active,
      stage_id,
      room_id,
      search,
      date,
      page = 1,
      limit = 10
    } = req.query;

    // Build where clause
    const where: any = {};

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (stage_id) {
      where.current_stage_id = parseInt(stage_id as string, 10);
    }

    if (room_id) {
      where.or_room_id = parseInt(room_id as string, 10);
    }

    if (date) {
      const searchDate = new Date(date as string);
      const nextDate = new Date(searchDate);
      nextDate.setDate(nextDate.getDate() + 1);

      where.created_at = {
        [Op.gte]: searchDate,
        [Op.lt]: nextDate
      };
    }

    // Search across visit_tracking_id, patient name, and MRN using a flat OR
    // so that a match on any one field is sufficient (avoids the INNER JOIN
    // killing results when only the tracking ID matches).
    if (search) {
      const s = `%${search}%`;
      where[Op.or] = [
        { visit_tracking_id: { [Op.like]: s } },
        { '$patient.first_name$': { [Op.like]: s } },
        { '$patient.last_name$':  { [Op.like]: s } },
        { '$patient.mrn$':        { [Op.like]: s } },
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Fetch visits with associations
    const { count, rows: visits } = await Visit.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'gender'],
        },
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['id', 'name', 'color', 'display_order']
        },
        {
          model: ORRoom,
          as: 'or_room',
          attributes: ['id', 'room_number', 'name', 'status'],
          required: false
        },
        {
          model: User,
          as: 'created_by_user',
          attributes: ['id', 'username', 'name', 'role']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      data: visits,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error('Get visits error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /visits - Create new visit
export const createVisit = async (req: AuthRequest, res: Response) => {
  try {
    const {
      patient,
      family_contact,
      current_stage_id,
      or_room_id,
      notes,
      scheduled_time
    } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Validate required fields
    if (!patient) {
      return res.status(400).json({
        success: false,
        error: 'Patient data is required'
      });
    }

    const { mrn, first_name, last_name, date_of_birth, gender } = patient;

    if (!mrn || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'Patient mrn, first_name, and last_name are required'
      });
    }

    // Default to the first stage (Arrived) if not provided
    const resolvedStageId = current_stage_id ?? (await Stage.findOne({ order: [['display_order', 'ASC']] }))?.id;

    if (!resolvedStageId) {
      return res.status(400).json({
        success: false,
        error: 'No stages found in database — run the seed script first'
      });
    }

    // Validate family contact if provided
    if (family_contact) {
      const { name, phone, relationship, consent_given } = family_contact;
      if (!name || !phone || !relationship || consent_given === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Family contact must include name, phone, relationship, and consent_given'
        });
      }
    }

    // Check if stage exists
    const stage = await Stage.findByPk(resolvedStageId);
    if (!stage) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage ID'
      });
    }

    // Check if OR room exists (if provided)
    if (or_room_id) {
      const room = await ORRoom.findByPk(or_room_id);
      if (!room) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OR room ID'
        });
      }
    }

    // Find or create patient
    let patientRecord = await Patient.findOne({ where: { mrn } });

    if (patientRecord) {
      // Check if patient already has an active visit
      const existingVisit = await Visit.findOne({
        where: {
          patient_id: patientRecord.id,
          active: true
        }
      });

      if (existingVisit) {
        return res.status(409).json({
          success: false,
          error: 'Patient already has an active visit',
          existing_visit_id: existingVisit.id
        });
      }

      // Update patient information
      patientRecord.first_name = first_name;
      patientRecord.last_name = last_name;
      patientRecord.date_of_birth = date_of_birth;
      patientRecord.gender = gender;
      await patientRecord.save();
    } else {
      // Create new patient
      patientRecord = await Patient.create({
        mrn,
        first_name,
        last_name,
        date_of_birth,
        gender
      });
    }

    // Generate visit tracking ID
    const visit_tracking_id = await generateVisitTrackingId();

    // Create visit
    const visit = await Visit.create({
      visit_tracking_id,
      patient_id: patientRecord.id,
      current_stage_id: resolvedStageId,
      or_room_id: or_room_id || null,
      created_by: req.user.id,
      notes: notes || null,
      scheduled_time: scheduled_time || null,
      barcode_data: visit_tracking_id,
      active: true
    });

    // Create family contact if provided
    if (family_contact) {
      await FamilyContact.create({
        visit_id: visit.id,
        name: family_contact.name,
        phone: family_contact.phone,
        relationship: family_contact.relationship,
        email: family_contact.email || null,
        consent_given: family_contact.consent_given
      });
    }

    // Fetch complete visit data with associations
    const createdVisit = await Visit.findByPk(visit.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'gender']
        },
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['id', 'name', 'color', 'display_order']
        },
        {
          model: ORRoom,
          as: 'or_room',
          attributes: ['id', 'room_number', 'name', 'status'],
          required: false
        },
        {
          model: User,
          as: 'created_by_user',
          attributes: ['id', 'username', 'name', 'role']
        },
        {
          model: FamilyContact,
          as: 'family_contacts',
          attributes: ['id', 'name', 'phone', 'relationship', 'email', 'consent_given']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdVisit
    });
  } catch (error) {
    console.error('Create visit error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// GET /visits/:id - Get detailed visit information
export const getVisitById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visit = await Visit.findByPk(id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'gender']
        },
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['id', 'name', 'color', 'display_order', 'description']
        },
        {
          model: ORRoom,
          as: 'or_room',
          attributes: ['id', 'room_number', 'name', 'status'],
          required: false
        },
        {
          model: User,
          as: 'created_by_user',
          attributes: ['id', 'username', 'name', 'role']
        },
        {
          model: FamilyContact,
          as: 'family_contacts',
          attributes: ['id', 'name', 'phone', 'relationship', 'email', 'consent_given']
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    res.json({
      success: true,
      data: visit
    });
  } catch (error) {
    console.error('Get visit by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// PUT /visits/:id - Update visit details
export const updateVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      current_stage_id,
      or_room_id,
      notes,
      scheduled_time,
      active
    } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const visit = await Visit.findByPk(id);

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // Validate stage if provided
    if (current_stage_id !== undefined) {
      const stage = await Stage.findByPk(current_stage_id);
      if (!stage) {
        return res.status(400).json({
          success: false,
          error: 'Invalid stage ID'
        });
      }
      visit.current_stage_id = current_stage_id;
    }

    // Validate OR room if provided
    if (or_room_id !== undefined) {
      if (or_room_id !== null) {
        const room = await ORRoom.findByPk(or_room_id);
        if (!room) {
          return res.status(400).json({
            success: false,
            error: 'Invalid OR room ID'
          });
        }
      }
      visit.or_room_id = or_room_id;
    }

    // Update other fields if provided
    if (notes !== undefined) {
      visit.notes = notes;
    }

    if (scheduled_time !== undefined) {
      visit.scheduled_time = scheduled_time;
    }

    if (active !== undefined) {
      visit.active = active;
    }

    await visit.save();

    // Fetch updated visit with associations
    const updatedVisit = await Visit.findByPk(visit.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'gender']
        },
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['id', 'name', 'color', 'display_order', 'description']
        },
        {
          model: ORRoom,
          as: 'or_room',
          attributes: ['id', 'room_number', 'name', 'status'],
          required: false
        },
        {
          model: User,
          as: 'created_by_user',
          attributes: ['id', 'username', 'name', 'role']
        },
        {
          model: FamilyContact,
          as: 'family_contacts',
          attributes: ['id', 'name', 'phone', 'relationship', 'email', 'consent_given']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedVisit
    });
  } catch (error) {
    console.error('Update visit error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// DELETE /visits/:id - Soft delete (mark as inactive)
export const deleteVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const visit = await Visit.findByPk(id);

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    if (!visit.active) {
      return res.status(400).json({
        success: false,
        error: 'Visit is already inactive'
      });
    }

    // Soft delete by marking as inactive
    visit.active = false;
    await visit.save();

    res.json({
      success: true,
      message: 'Visit marked as inactive',
      data: {
        id: visit.id,
        visit_tracking_id: visit.visit_tracking_id,
        active: visit.active
      }
    });
  } catch (error) {
    console.error('Delete visit error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
