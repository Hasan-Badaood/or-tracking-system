import { Op } from 'sequelize';
import { CleaningTimer } from '../models/CleaningTimer';
import { ORRoom } from '../models/ORRoom';
import { Visit } from '../models/Visit';

const POLL_INTERVAL_MS = 60_000; // check every minute
const CLEANING_MINUTES = 15;

async function autoCompleteExpiredTimers(): Promise<void> {
  try {
    let completed = 0;

    // 1. Complete timers that have passed their scheduled end time
    const expiredTimers = await CleaningTimer.findAll({
      where: {
        completed: false,
        scheduled_end_at: { [Op.lte]: new Date() },
      },
    });

    for (const timer of expiredTimers) {
      const room = await ORRoom.findByPk(timer.room_id);
      if (!room) continue;

      timer.completed = true;
      timer.actual_end_at = new Date();
      await timer.save();

      if (room.status === 'Cleaning') {
        room.status = 'Available';
        room.last_status_change = new Date();
        await room.save();
      }
      completed++;
    }

    // 2. Recover rooms stuck in Cleaning without any active timer
    //    (e.g. manual status change, server restart, or any other edge case)
    const stuckCutoff = new Date(Date.now() - CLEANING_MINUTES * 60_000);
    const stuckRooms = await ORRoom.findAll({
      where: {
        status: 'Cleaning',
        last_status_change: { [Op.lte]: stuckCutoff },
      },
    });

    for (const room of stuckRooms) {
      const activeTimer = await CleaningTimer.findOne({
        where: { room_id: room.id, completed: false },
      });
      if (activeTimer) continue; // already handled above

      room.status = 'Available';
      room.last_status_change = new Date();
      await room.save();
      completed++;
      console.log(`[cleaning] Room "${room.name}" recovered from stuck Cleaning state`);
    }

    // 3. Recover rooms stuck in Occupied with no active patient
    //    (e.g. visit discharged without going through proper stage, data inconsistency)
    const occupiedRooms = await ORRoom.findAll({
      where: { status: 'Occupied' },
    });

    for (const room of occupiedRooms) {
      let isOrphaned = false;

      if (room.current_visit_id === null) {
        isOrphaned = true;
      } else {
        const visit = await Visit.findByPk(room.current_visit_id);
        if (!visit || !visit.active) isOrphaned = true;
      }

      if (!isOrphaned) continue;

      // Move to Cleaning so the room goes through the standard cleaning cycle
      room.status = 'Cleaning';
      room.current_visit_id = null;
      room.last_status_change = new Date();
      await room.save();

      // Destroy any stale incomplete timers for this room then create a fresh one
      await CleaningTimer.destroy({ where: { room_id: room.id, completed: false } });
      const startedAt = new Date();
      await CleaningTimer.create({
        room_id: room.id,
        visit_id: null,
        started_at: startedAt,
        scheduled_end_at: new Date(startedAt.getTime() + CLEANING_MINUTES * 60_000),
        duration_minutes: CLEANING_MINUTES,
        completed: false,
      });

      completed++;
      console.log(`[cleaning] Room "${room.name}" recovered from orphaned Occupied state — cleaning started`);
    }

    if (completed > 0) {
      console.log(`[cleaning] Auto-completed ${completed} room(s)`);
    }
  } catch (err) {
    console.error('[cleaning] Error in auto-complete job:', err);
  }
}

export function startCleaningScheduler(): void {
  setInterval(autoCompleteExpiredTimers, POLL_INTERVAL_MS);
  console.log('[cleaning] Scheduler started — checking every minute for expired timers');
}
