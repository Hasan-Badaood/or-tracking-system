// In-memory JWT token blocklist.
// Stores token -> expiry (unix ms) so expired entries can be pruned.
// Resets on server restart, which is acceptable for an 8-hour token window.

const blocklist = new Map<string, number>();

// Prune expired tokens every 15 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of blocklist) {
    if (expiresAt < now) {
      blocklist.delete(token);
    }
  }
}, 15 * 60 * 1000);

export const addToBlocklist = (token: string, expiresAt: number): void => {
  blocklist.set(token, expiresAt);
};

export const isBlacklisted = (token: string): boolean => {
  const expiresAt = blocklist.get(token);
  if (expiresAt === undefined) return false;
  // Remove inline if already expired
  if (expiresAt < Date.now()) {
    blocklist.delete(token);
    return false;
  }
  return true;
};
