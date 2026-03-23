import { Op } from 'sequelize';
import { CleaningTimer } from '../models/CleaningTimer';
import { ORRoom } from '../models/ORRoom';

const POLL_INTERVAL_MS = 60_000; // check every minute

async function autoCompleteExpiredTimers(): Promise<void> {
  try {
    const expired = await CleaningTimer.findAll({
      where: {
        completed: false,
        scheduled_end_at: { [Op.lte]: new Date() },
      },
    });

    for (const timer of expired) {
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
    }

    if (expired.length > 0) {
      console.log(`[cleaning] Auto-completed ${expired.length} expired cleaning timer(s)`);
    }
  } catch (err) {
    console.error('[cleaning] Error in auto-complete job:', err);
  }
}

export function startCleaningScheduler(): void {
  setInterval(autoCompleteExpiredTimers, POLL_INTERVAL_MS);
  console.log('[cleaning] Scheduler started — checking every minute for expired timers');
}
