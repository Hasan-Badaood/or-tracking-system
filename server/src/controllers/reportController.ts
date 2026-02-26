import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Visit, Stage, ORRoom, StageEvent, Patient } from '../models';

// GET /reports/daily-summary - Daily OR utilization summary
export const getDailySummary = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get visits created on this date
    const visits = await Visit.findAll({
      where: {
        created_at: {
          [Op.gte]: startOfDay,
          [Op.lt]: endOfDay
        }
      },
      include: [
        {
          model: Stage,
          as: 'current_stage',
          attributes: ['name']
        }
      ]
    });

    const totalVisits = visits.length;
    const completedVisits = visits.filter(v => {
      const stage = v.get('current_stage') as any;
      return stage.name === 'Discharged';
    }).length;
    const activeVisits = visits.filter(v => {
      const stage = v.get('current_stage') as any;
      return stage.name !== 'Discharged';
    }).length;

    // Calculate average duration
    const durations = visits.map(v => {
      const created = new Date(v.created_at).getTime();
      const updated = new Date(v.updated_at).getTime();
      return Math.floor((updated - created) / 60000);
    });
    const averageDuration = durations.length > 0
      ? Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Group by stage
    const byStage: any[] = [];
    const stageGroups = new Map<string, number[]>();

    visits.forEach(v => {
      const stage = v.get('current_stage') as any;
      if (!stageGroups.has(stage.name)) {
        stageGroups.set(stage.name, []);
      }
      const created = new Date(v.created_at).getTime();
      const updated = new Date(v.updated_at).getTime();
      const duration = Math.floor((updated - created) / 60000);
      stageGroups.get(stage.name)!.push(duration);
    });

    stageGroups.forEach((durations, stageName) => {
      const avgDuration = durations.length > 0
        ? Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
      byStage.push({
        stage_name: stageName,
        count: durations.length,
        average_duration_minutes: avgDuration
      });
    });

    // OR utilization (simplified)
    const totalMinutesInDay = 24 * 60;
    const utilizationRate = totalVisits > 0 ? Math.min(100, (averageDuration * totalVisits / totalMinutesInDay) * 100) : 0;

    res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      summary: {
        total_visits: totalVisits,
        completed_visits: completedVisits,
        active_visits: activeVisits,
        cancelled_visits: 0,
        average_duration_minutes: averageDuration,
        or_utilization_rate: parseFloat(utilizationRate.toFixed(1))
      },
      by_stage: byStage
    });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// GET /reports/stage-duration - Average time spent in each stage
export const getStageDuration = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }

    const startDate = new Date(start_date as string);
    const endDate = new Date(end_date as string);

    // Get all stage events in date range
    const stageEvents = await StageEvent.findAll({
      where: {
        created_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      include: [
        {
          model: Stage,
          as: 'to_stage',
          attributes: ['name']
        }
      ],
      order: [['visit_id', 'ASC'], ['created_at', 'ASC']]
    });

    // Group by stage and calculate durations
    const stageDurations = new Map<string, number[]>();

    // Group events by visit
    const visitEvents = new Map<number, any[]>();
    stageEvents.forEach(event => {
      if (!visitEvents.has(event.visit_id)) {
        visitEvents.set(event.visit_id, []);
      }
      visitEvents.get(event.visit_id)!.push(event);
    });

    // Calculate duration for each stage transition
    visitEvents.forEach(events => {
      for (let i = 0; i < events.length; i++) {
        const currentEvent = events[i];
        const nextEvent = events[i + 1];
        const stage = currentEvent.get('to_stage') as any;
        const stageName = stage.name;

        if (nextEvent) {
          const duration = Math.floor(
            (new Date(nextEvent.created_at).getTime() - new Date(currentEvent.created_at).getTime()) / 60000
          );

          if (!stageDurations.has(stageName)) {
            stageDurations.set(stageName, []);
          }
          stageDurations.get(stageName)!.push(duration);
        }
      }
    });

    const results: any[] = [];
    stageDurations.forEach((durations, stageName) => {
      const sorted = durations.sort((a, b) => a - b);
      const average = Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length);
      results.push({
        stage_name: stageName,
        average_minutes: average,
        min_minutes: sorted[0],
        max_minutes: sorted[sorted.length - 1],
        sample_size: durations.length
      });
    });

    res.json({
      success: true,
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      },
      stage_durations: results
    });
  } catch (error) {
    console.error('Get stage duration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
