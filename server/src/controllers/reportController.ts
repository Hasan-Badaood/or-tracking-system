import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Visit, Stage, ORRoom, StageEvent, Patient, User } from '../models';

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
      const created = new Date(v.created_at ?? 0).getTime();
      const updated = new Date(v.updated_at ?? v.created_at ?? 0).getTime();
      const diff = Math.floor((updated - created) / 60000);
      return isFinite(diff) ? diff : 0;
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
      const created = new Date(v.created_at ?? 0).getTime();
      const updated = new Date(v.updated_at ?? v.created_at ?? 0).getTime();
      const duration = Math.floor((updated - created) / 60000);
      if (isFinite(duration)) stageGroups.get(stage.name)!.push(duration);
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
        or_utilization_rate: parseFloat(utilizationRate.toFixed(1)) || 0
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

// GET /reports/date-range - Daily visit totals over a date range
export const getDateRange = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'start_date and end_date are required' });
    }

    const start = new Date(start_date as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(end_date as string);
    end.setHours(23, 59, 59, 999);

    const visits = await Visit.findAll({
      where: { created_at: { [Op.gte]: start, [Op.lte]: end } },
      include: [{ model: Stage, as: 'current_stage', attributes: ['name'] }],
    });

    // Build a map of date → counts
    const byDate = new Map<string, { total: number; completed: number; active: number }>();

    // Pre-fill every day in range so gaps show as 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      byDate.set(d.toISOString().split('T')[0], { total: 0, completed: 0, active: 0 });
    }

    visits.forEach((v) => {
      const ts = v.created_at;
      if (!ts) return;
      const d = new Date(ts);
      if (!isFinite(d.getTime())) return;
      const dateKey = d.toISOString().split('T')[0];
      const entry = byDate.get(dateKey);
      if (!entry) return;
      entry.total++;
      const stageName = (v.get('current_stage') as any)?.name;
      if (stageName === 'Discharged') entry.completed++;
      else entry.active++;
    });

    const rows = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    res.json({ success: true, rows });
  } catch (error) {
    console.error('Get date range error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
      durations: results
    });
  } catch (error) {
    console.error('Get stage duration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// GET /reports/audit-log - Recent stage transition events
export const getAuditLog = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const events = await StageEvent.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Visit,
          as: 'visit',
          attributes: ['visit_tracking_id'],
          include: [{ model: Patient, as: 'patient', attributes: ['first_name', 'last_name'] }],
        },
        { model: Stage, as: 'from_stage', attributes: ['name', 'color'] },
        { model: Stage, as: 'to_stage',   attributes: ['name', 'color'] },
        { model: User,  as: 'updated_by_user', attributes: ['name', 'role'] },
      ],
    });

    const rows = events.rows.map((e: any) => ({
      id: e.id,
      created_at: e.created_at,
      visit_tracking_id: e.visit?.visit_tracking_id ?? null,
      patient_name: e.visit?.patient
        ? `${e.visit.patient.first_name} ${e.visit.patient.last_name}`
        : null,
      from_stage: e.from_stage ? { name: e.from_stage.name, color: e.from_stage.color } : null,
      to_stage:   e.to_stage   ? { name: e.to_stage.name,   color: e.to_stage.color   } : null,
      updated_by: e.updated_by_user ? { name: e.updated_by_user.name, role: e.updated_by_user.role } : null,
      notes: e.notes ?? null,
    }));

    res.json({ success: true, total: events.count, rows });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
