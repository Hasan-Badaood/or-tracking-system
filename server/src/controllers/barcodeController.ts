import { Request, Response } from 'express';
import bwipjs from 'bwip-js';
import { Visit, Patient, Stage, ORRoom } from '../models';

// POST /barcode/generate - Generate CODE128 barcode PNG for a visit
export const generateBarcode = async (req: Request, res: Response) => {
  try {
    const { visit_tracking_id, width = 60, height = 15 } = req.body;

    if (!visit_tracking_id) {
      return res.status(400).json({
        success: false,
        error: 'visit_tracking_id is required'
      });
    }

    const visit = await Visit.findOne({ where: { visit_tracking_id } });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: visit_tracking_id,
      scale: 2,
      width: Number(width),
      height: Number(height),
      includetext: true,
      textxalign: 'center',
    });

    const base64 = `data:image/png;base64,${png.toString('base64')}`;

    res.json({
      success: true,
      barcode: {
        data: visit_tracking_id,
        format: 'CODE128',
        base64,
      }
    });
  } catch (error) {
    console.error('Generate barcode error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /barcode/scan - Look up a visit by scanned barcode value
export const scanBarcode = async (req: Request, res: Response) => {
  try {
    const { barcode_data } = req.body;

    if (!barcode_data) {
      return res.status(400).json({
        success: false,
        error: 'barcode_data is required'
      });
    }

    const visit = await Visit.findOne({
      where: { visit_tracking_id: barcode_data },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['first_name', 'last_name', 'mrn']
        },
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['id', 'name']
        },
        {
          model: ORRoom,
          as: 'or_room',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: `Visit not found for barcode: ${barcode_data}`
      });
    }

    const patient = visit.get('patient') as any;
    const currentStage = visit.get('current_stage') as any;
    const orRoom = visit.get('or_room') as any;

    res.json({
      success: true,
      visit: {
        id: visit.id,
        visit_tracking_id: visit.visit_tracking_id,
        patient: {
          first_name: patient.first_name,
          last_name: patient.last_name,
          mrn: patient.mrn
        },
        current_stage: {
          id: currentStage.id,
          name: currentStage.name
        },
        or_room: orRoom ? { id: orRoom.id, name: orRoom.name } : null
      }
    });
  } catch (error) {
    console.error('Scan barcode error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
