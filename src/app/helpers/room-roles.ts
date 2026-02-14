import { contentGetEntriesByType } from '@helpers/content';
import type { RoomId } from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';

let roleCache: Map<string, RoomId> | undefined = undefined;

function buildRoleCache(): Map<string, RoomId> {
  const rooms = contentGetEntriesByType<RoomContent>('room');
  const map = new Map<string, RoomId>();
  for (const room of rooms) {
    if (room.role) {
      map.set(room.role, room.id as RoomId);
    }
  }
  return map;
}

export function roomRoleFindById(role: string): RoomId | undefined {
  if (!roleCache) {
    roleCache = buildRoleCache();
  }
  return roleCache.get(role);
}

export function roomRoleResetCache(): void {
  roleCache = undefined;
}
