import { contentGetEntriesByType } from '@helpers/content';
import { createLazyCache } from '@helpers/lazy-cache';
import type { RoomId } from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';

const roleCache = createLazyCache((): Map<string, RoomId> => {
  const rooms = contentGetEntriesByType<RoomContent>('room');
  const map = new Map<string, RoomId>();
  for (const room of rooms) {
    if (room.role) {
      map.set(room.role, room.id as RoomId);
    }
  }
  return map;
});

export function roomRoleFindById(role: string): RoomId | undefined {
  return roleCache.get().get(role);
}

export function roomRoleResetCache(): void {
  roleCache.reset();
}
