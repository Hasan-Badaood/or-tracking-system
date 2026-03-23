import { Op } from 'sequelize';
import { CleaningTimer } from '../models/CleaningTimer';
import { ORRoom } from '../models/ORRoom';

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
