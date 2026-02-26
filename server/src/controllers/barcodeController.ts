import { Request, Response } from 'express';
import { Visit, Patient, Stage, ORRoom } from '../models';

// POST /barcode/generate - Generate barcode for a visit
export const generateBarcode = async (req: Request, res: Response) => {
  try {
    const { visit_tracking_id, format = 'CODE128', width = 200, height = 80 } = req.body;

    if (!visit_tracking_id) {
      return res.status(400).json({
        success: false,
        error: 'visit_tracking_id is required'
      });
    }

    const visit = await Visit.findOne({
      where: { visit_tracking_id }
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        error: 'Visit not found'
      });
    }

    // In production, use a barcode library like 'bwip-js' to generate actual barcode images
    // For now, return a placeholder response
    const barcodeData = {
      data: visit_tracking_id,
      format,
      image_url: `/api/barcode/image/${visit_tracking_id}.png`,
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    res.json({
      success: true,
      barcode: barcodeData
    });
  } catch (error) {
    console.error('Generate barcode error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /barcode/scan - Process scanned barcode and retrieve visit
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
      where: { barcode_data },
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
        or_room: orRoom ? {
          id: orRoom.id,
          name: orRoom.name
        } : null
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
