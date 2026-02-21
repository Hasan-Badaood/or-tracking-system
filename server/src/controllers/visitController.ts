import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Visit } from '../models/Visit';
import { Patient } from '../models/Patient';
import { Stage } from '../models/Stage';

export const getVisits = async (req: Request, res: Response) => {
  try {
    const visits = await Visit.findAll({
      where: { active: true },
      include: [
        { model: Patient },
        { model: Stage, as: 'current_stage' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ visits });
  } catch (error) {
    console.error('Get visits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVisit = async (req: Request, res: Response) => {
  try {
    const { patient, scheduled_time } = req.body;

    let patientRecord = await Patient.findOne({ where: { mrn: patient.mrn } });

    if (!patientRecord) {
      patientRecord = await Patient.create({
        mrn: patient.mrn,
        first_name: patient.first_name,
        last_name: patient.last_name
      });
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Visit.count({
      where: {
        visit_tracking_id: { [Op.like]: `VT-${date}-%` }
      }
    });

    const tracking_id = `VT-${date}-${String(count + 1).padStart(3, '0')}`;

    const visit = await Visit.create({
      visit_tracking_id: tracking_id,
      patient_id: patientRecord.id,
      current_stage_id: 1,
      active: true
    });

    const fullVisit = await Visit.findByPk(visit.id, {
      include: [
        { model: Patient },
        { model: Stage, as: 'current_stage' }
      ]
    });

    res.status(201).json({ visit: fullVisit });
  } catch (error) {
    console.error('Create visit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { to_stage_id } = req.body;

    const visit = await Visit.findByPk(id);

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    await visit.update({ current_stage_id: to_stage_id });

    const updatedVisit = await Visit.findByPk(id, {
      include: [
        { model: Patient },
        { model: Stage, as: 'current_stage' }
      ]
    });

    res.json({ message: 'Stage updated', visit: updatedVisit });
  } catch (error) {
    console.error('Update stage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
