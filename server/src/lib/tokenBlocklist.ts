import { Op } from 'sequelize';
import { BlacklistedToken } from '../models/BlacklistedToken';

// Fallback in-memory set used before the DB is ready or if a DB call fails.
const memoryFallback = new Map<string, number>();

export const addToBlocklist = async (token: string, expiresAt: number): Promise<void> => {
  memoryFallback.set(token, expiresAt);
  try {
    await BlacklistedToken.upsert({ token, expires_at: new Date(expiresAt) });
  } catch {
    // Keep memory fallback — the token is still blocked this session.
  }
};

export const isBlacklisted = async (token: string): Promise<boolean> => {
  // Check memory first (fast path / pre-DB-ready window)
  const memExp = memoryFallback.get(token);
  if (memExp !== undefined) {
    if (memExp < Date.now()) {
      memoryFallback.delete(token);
    } else {
      return true;
    }
  }

  try {
    const record = await BlacklistedToken.findOne({
      where: { token, expires_at: { [Op.gt]: new Date() } },
    });
    return record !== null;
  } catch {
    return false;
  }
};

// Prune expired DB rows every 30 minutes.
setInterval(async () => {
  try {
    await BlacklistedToken.destroy({ where: { expires_at: { [Op.lte]: new Date() } } });
  } catch { /* ignore */ }

  // Prune memory fallback too
  const now = Date.now();
  for (const [token, exp] of memoryFallback) {
    if (exp < now) memoryFallback.delete(token);
  }
}, 30 * 60 * 1000);
