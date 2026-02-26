import { Request, Response } from 'express';
import { ORRoom, Visit, Patient, Stage, CleaningTimer } from '../models';

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// GET /rooms - Get all OR rooms with current status
export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await ORRoom.findAll({
      where: { active: true },
      include: [
        {
          model: Visit,
          as: 'current_visit',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['first_name', 'last_name']
            }
          ],
          attributes: ['id', 'visit_tracking_id']
        },
        {
          model: CleaningTimer,
          as: 'cleaning_timer',
          where: { completed: false },
          required: false
        }
      ],
      order: [['room_number', 'ASC']]
    });

    const roomsWithTimer = rooms.map(room => {
      const roomData: any = {
        id: room.id,
        room_number: room.room_number,
        name: room.name,
        room_type: room.room_type,
        capacity: room.capacity,
        status: room.status,
        current_visit: null,
        cleaning_timer: null,
        last_status_change: room.last_status_change,
        active: room.active
      };

      if (room.get('current_visit')) {
        const visit = room.get('current_visit') as any;
        const patient = visit.patient;
        roomData.current_visit = {
          id: visit.id,
          visit_tracking_id: visit.visit_tracking_id,
          patient_name: `${patient.first_name} ${patient.last_name.charAt(0)}.`
        };
      }

      if (room.get('cleaning_timer')) {
        const timer = room.get('cleaning_timer') as any;
        const now = new Date();
        const scheduledEnd = new Date(timer.scheduled_end_at);
        const minutesRemaining = Math.max(0, Math.floor((scheduledEnd.getTime() - now.getTime()) / 60000));

        roomData.cleaning_timer = {
          started_at: timer.started_at,
          scheduled_end_at: timer.scheduled_end_at,
          minutes_remaining: minutesRemaining,
          completed: timer.completed
        };
      }

      return roomData;
    });

    res.json({
      success: true,
      rooms: roomsWithTimer
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// GET /rooms/:id - Get detailed information about a specific OR room
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await ORRoom.findByPk(id, {
      include: [
        {
          model: Visit,
          as: 'current_visit',
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['first_name', 'last_name']
            },
            {
              model: Stage,
              as: 'current_stage',
              attributes: ['name']
            }
          ]
        },
        {
          model: CleaningTimer,
          as: 'cleaning_timer',
          where: { completed: false },
          required: false
        }
      ]
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    const roomData: any = {
      id: room.id,
      room_number: room.room_number,
      name: room.name,
      room_type: room.room_type,
      capacity: room.capacity,
      status: room.status,
      current_visit: null,
      recent_history: [],
      last_status_change: room.last_status_change,
      active: room.active
    };

    if (room.get('current_visit')) {
      const visit = room.get('current_visit') as any;
      const patient = visit.patient;
      const durationMinutes = Math.floor((Date.now() - new Date(visit.created_at).getTime()) / 60000);

      roomData.current_visit = {
        id: visit.id,
        visit_tracking_id: visit.visit_tracking_id,
        patient: {
          first_name: patient.first_name,
          last_name: patient.last_name
        },
        current_stage: visit.current_stage.name,
        duration_minutes: durationMinutes
      };

      roomData.recent_history = [{
        visit_tracking_id: visit.visit_tracking_id,
        patient_name: `${patient.first_name} ${patient.last_name.charAt(0)}.`,
        start_time: visit.created_at,
        end_time: null,
        duration_minutes: durationMinutes,
        status: 'In Progress'
      }];
    }

    res.json({
      success: true,
      room: roomData
    });
  } catch (error) {
    console.error('Get room by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// PUT /rooms/:id/status - Manually update OR room status
export const updateRoomStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const allowedStatuses = ['Available', 'Occupied', 'Cleaning', 'Maintenance'];

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room status',
        allowed_statuses: allowedStatuses
      });
    }

    const room = await ORRoom.findByPk(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    room.status = status;
    room.last_status_change = new Date();
    await room.save();

    res.json({
      success: true,
      room: {
        id: room.id,
        status: room.status,
        last_status_change: room.last_status_change
      },
      message: 'Room status updated successfully'
    });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /rooms/:id/cleaning/start - Manually start cleaning timer
export const startCleaning = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { duration_minutes = 15, visit_id } = req.body;

    const room = await ORRoom.findByPk(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    const startedAt = new Date();
    const scheduledEndAt = new Date(startedAt.getTime() + duration_minutes * 60000);

    const cleaningTimer = await CleaningTimer.create({
      room_id: room.id,
      visit_id: visit_id || null,
      started_at: startedAt,
      scheduled_end_at: scheduledEndAt,
      duration_minutes,
      completed: false
    });

    room.status = 'Cleaning';
    room.last_status_change = new Date();
    await room.save();

    res.json({
      success: true,
      cleaning_timer: {
        id: cleaningTimer.id,
        room_id: cleaningTimer.room_id,
        visit_id: cleaningTimer.visit_id,
        started_at: cleaningTimer.started_at,
        scheduled_end_at: cleaningTimer.scheduled_end_at,
        duration_minutes: cleaningTimer.duration_minutes,
        completed: cleaningTimer.completed
      },
      room: {
        id: room.id,
        status: room.status
      }
    });
  } catch (error) {
    console.error('Start cleaning error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// POST /rooms/:id/cleaning/complete - Mark cleaning as complete (manual override)
export const completeCleaning = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { override_reason } = req.body;

    const room = await ORRoom.findByPk(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    const cleaningTimer = await CleaningTimer.findOne({
      where: {
        room_id: room.id,
        completed: false
      },
      order: [['created_at', 'DESC']]
    });

    if (!cleaningTimer) {
      return res.status(404).json({
        success: false,
        error: 'No active cleaning timer found for this room'
      });
    }

    cleaningTimer.completed = true;
    cleaningTimer.actual_end_at = new Date();
    cleaningTimer.manually_overridden = true;
    cleaningTimer.override_reason = override_reason || null;
    await cleaningTimer.save();

    room.status = 'Available';
    room.last_status_change = new Date();
    await room.save();

    res.json({
      success: true,
      room: {
        id: room.id,
        status: room.status
      },
      cleaning_timer: {
        id: cleaningTimer.id,
        completed: cleaningTimer.completed,
        manually_overridden: cleaningTimer.manually_overridden,
        actual_end_at: cleaningTimer.actual_end_at
      }
    });
  } catch (error) {
    console.error('Complete cleaning error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
