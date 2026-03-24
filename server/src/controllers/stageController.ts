import { Request, Response } from 'express';
import { Visit, Stage, StageEvent, ORRoom, User, FamilyContact, Patient } from '../models';
import { CleaningTimer } from '../models/CleaningTimer';
import { sequelize } from '../config/database';
import { notifyFamilyContacts } from '../services/notificationService';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

/**
 * PUT /visits/:id/stage - Update patient stage (main workflow function)
 * Updates the stage of a visit and records the transition in stage_events
 */
export const updateVisitStage = async (req: AuthRequest, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { to_stage_id, or_room_id, notes } = req.body;

    // Authentication check
    if (!req.user) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Validation
    if (!to_stage_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'to_stage_id is required'
      });
    }

    // Fetch visit
    const visit = await Visit.findByPk(id, {
      include: [
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['id', 'name', 'color', 'display_order']
        }
      ],
      transaction
    });

    if (!visit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // Validate to_stage exists
    const toStage = await Stage.findByPk(to_stage_id, { transaction });
    if (!toStage) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Invalid to_stage_id: stage not found'
      });
    }

    if (!toStage.active) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot transition to inactive stage'
      });
    }

    // Enforce sequential stage progression — no skipping or going backward
    const fromStage = visit.get('current_stage') as any;
    if (!fromStage) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Current stage not found for this visit'
      });
    }
    if (toStage.display_order !== fromStage.display_order + 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Invalid stage transition: can only advance one step at a time (current: ${fromStage.name}, attempted: ${toStage.name})`
      });
    }

    // OR room is mandatory when moving to "In Theatre"
    const isInTheatre = toStage.name.trim().toLowerCase() === 'in theatre';
    if (isInTheatre && (or_room_id === undefined || or_room_id === null)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'An OR room must be assigned when moving a patient to In Theatre'
      });
    }

    // Handle OR room assignment if provided
    let orRoomUpdated = false;
    let roomDetails = null;

    if (or_room_id !== undefined && or_room_id !== null) {
      const orRoom = await ORRoom.findByPk(or_room_id, { transaction });

      if (!orRoom) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Invalid or_room_id: OR room not found'
        });
      }

      if (!orRoom.active) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Cannot assign inactive OR room'
        });
      }

      if (orRoom.status !== 'Available') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Room is not available (current status: ${orRoom.status})`
        });
      }

      // Update OR room status to Occupied and link to visit
      orRoom.status = 'Occupied';
      orRoom.current_visit_id = visit.id;
      orRoom.last_status_change = new Date();
      await orRoom.save({ transaction });

      // Update visit with OR room
      visit.or_room_id = or_room_id;

      orRoomUpdated = true;
      roomDetails = {
        id: orRoom.id,
        room_number: orRoom.room_number,
        name: orRoom.name,
        status: orRoom.status
      };
    }

    const fromStageId = visit.current_stage_id;

    // If leaving "In Theatre", free the current OR room and start a 15-minute cleaning timer
    const leavingTheatre = fromStage?.name?.trim().toLowerCase() === 'in theatre' && !isInTheatre;
    if (leavingTheatre && visit.or_room_id) {
      const prevRoom = await ORRoom.findByPk(visit.or_room_id, { transaction });
      if (prevRoom) {
        prevRoom.status = 'Cleaning';
        prevRoom.current_visit_id = null;
        prevRoom.last_status_change = new Date();
        await prevRoom.save({ transaction });

        const startedAt = new Date();
        const CLEANING_MINUTES = 15;
        await CleaningTimer.create({
          room_id: prevRoom.id,
          visit_id: visit.id,
          started_at: startedAt,
          scheduled_end_at: new Date(startedAt.getTime() + CLEANING_MINUTES * 60_000),
          duration_minutes: CLEANING_MINUTES,
          completed: false,
        }, { transaction });
      }
      visit.or_room_id = null;
    }

    // Create stage event record
    const stageEvent = await StageEvent.create({
      visit_id: visit.id,
      from_stage_id: fromStageId,
      to_stage_id: to_stage_id,
      updated_by: req.user.id,
      notes: notes || null
    }, { transaction });

    // Update visit current_stage_id
    visit.current_stage_id = to_stage_id;

    // Auto-deactivate when discharged
    if (toStage.name === 'Discharged') {
      visit.active = false;
    }

    await visit.save({ transaction });

    // Commit transaction
    await transaction.commit();

    // Fetch complete stage event with associations
    const completeStageEvent = await StageEvent.findByPk(stageEvent.id, {
      include: [
        {
          model: Stage,
          as: 'from_stage',
          attributes: ['id', 'name', 'color', 'display_order']
        },
        {
          model: Stage,
          as: 'to_stage',
          attributes: ['id', 'name', 'color', 'display_order']
        },
        {
          model: User,
          as: 'updated_by_user',
          attributes: ['id', 'username', 'name', 'role']
        }
      ]
    });

    // Fetch updated visit with associations
    const updatedVisit = await Visit.findByPk(visit.id, {
      include: [
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
        }
      ]
    });

    // Build response
    const response: any = {
      success: true,
      data: {
        stage_event: completeStageEvent,
        updated_visit: updatedVisit
      }
    };

    if (orRoomUpdated) {
      response.data.or_room_updated = roomDetails;
    }

    res.json(response);

    // Fire-and-forget family notifications (after response is sent)
    try {
      const fullVisit = await Visit.findByPk(visit.id, {
        include: [
          { model: FamilyContact, as: 'family_contacts', where: { consent_given: true }, required: false },
          { model: Stage, as: 'current_stage', attributes: ['name'] },
          { model: Patient, as: 'patient', attributes: ['first_name', 'last_name'] },
        ],
      });
      const contacts = (fullVisit?.get('family_contacts') as any[]) ?? [];
      if (contacts.length > 0) {
        const patient = fullVisit?.get('patient') as any;
        const patientName = patient
          ? `${patient.first_name} ${patient.last_name}`
          : 'your family member';
        notifyFamilyContacts(contacts, {
          patientName,
          stageName: toStage.name,
          visitTrackingId: visit.visit_tracking_id,
          timestamp: new Date(),
        }).catch((err) => console.error('Notification error:', err));
      }
    } catch (err) {
      console.error('Notification lookup error:', err);
    }
  } catch (error) {
    await transaction.rollback();
    console.error('Update visit stage error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * GET /visits/:id/timeline - Get complete stage history for a visit
 * Returns all stage transitions with duration calculations
 */
export const getVisitTimeline = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate visit exists
    const visit = await Visit.findByPk(id);
    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // Fetch all stage events for the visit, ordered by created_at DESC (newest first)
    const stageEvents = await StageEvent.findAll({
      where: {
        visit_id: id
      },
      include: [
        {
          model: Stage,
          as: 'from_stage',
          attributes: ['id', 'name', 'color', 'display_order']
        },
        {
          model: Stage,
          as: 'to_stage',
          attributes: ['id', 'name', 'color', 'display_order']
        },
        {
          model: User,
          as: 'updated_by_user',
          attributes: ['id', 'username', 'name', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calculate duration_minutes between consecutive events
    const eventsWithDuration = stageEvents.map((event, index) => {
      const eventData = event.toJSON() as any;
      // Sequelize with underscored:true may serialize as created_at or createdAt
      const thisTs: string | undefined = eventData.created_at ?? eventData.createdAt;
      eventData.created_at = thisTs;

      // Calculate duration from this event to the next (previous in time)
      if (index < stageEvents.length - 1) {
        const nextData = stageEvents[index + 1].toJSON() as any;
        const nextTs: string | undefined = nextData.created_at ?? nextData.createdAt;
        const durationMs = new Date(thisTs!).getTime() - new Date(nextTs!).getTime();
        eventData.duration_minutes = isFinite(durationMs) ? Math.round(durationMs / 60000) : null;
      } else {
        // For the oldest event, calculate duration from event time to now
        const durationMs = Date.now() - new Date(thisTs!).getTime();
        eventData.duration_minutes = isFinite(durationMs) ? Math.round(durationMs / 60000) : null;
      }

      return eventData;
    });

    // Calculate total duration from first event to now
    let totalDurationMinutes = 0;
    if (stageEvents.length > 0) {
      const oldestData = stageEvents[stageEvents.length - 1].toJSON() as any;
      const oldestTs: string | undefined = oldestData.created_at ?? oldestData.createdAt;
      const totalMs = Date.now() - new Date(oldestTs!).getTime();
      totalDurationMinutes = isFinite(totalMs) ? Math.round(totalMs / 60000) : 0;
    }

    res.json({
      success: true,
      data: {
        visit_id: parseInt(id, 10),
        stage_events: eventsWithDuration,
        total_duration_minutes: totalDurationMinutes,
        event_count: stageEvents.length
      }
    });
  } catch (error) {
    console.error('Get visit timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * GET /stages - Get stages (active only by default; ?all=true for all)
 */
export const getAllStages = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.all !== 'true') where.active = true;

    const stages = await Stage.findAll({
      where,
      order: [['display_order', 'ASC']],
      attributes: ['id', 'name', 'color', 'display_order', 'description', 'active']
    });

    res.json({ success: true, data: stages, count: stages.length });
  } catch (error) {
    console.error('Get all stages error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * POST /stages - Create a new stage (admin only)
 */
export const createStage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { name, color, display_order, description } = req.body;
    if (!name || !color) {
      return res.status(400).json({ success: false, error: 'name and color are required' });
    }

    const maxOrder = await Stage.max<number, Stage>('display_order') ?? 0;
    const stage = await Stage.create({
      name,
      color,
      display_order: display_order ?? maxOrder + 1,
      description: description || null,
      active: true
    });

    res.status(201).json({ success: true, data: stage });
  } catch (error) {
    console.error('Create stage error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * PUT /stages/:id - Update a stage (admin only)
 */
export const updateStage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const stage = await Stage.findByPk(req.params.id);
    if (!stage) {
      return res.status(404).json({ success: false, error: 'Stage not found' });
    }

    const { name, color, display_order, description, active } = req.body;
    if (name !== undefined) stage.name = name;
    if (color !== undefined) stage.color = color;
    if (display_order !== undefined) stage.display_order = display_order;
    if (description !== undefined) stage.description = description;
    if (active !== undefined) stage.active = active;
    await stage.save();

    res.json({ success: true, data: stage });
  } catch (error) {
    console.error('Update stage error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
