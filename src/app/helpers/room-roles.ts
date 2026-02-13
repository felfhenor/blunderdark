import { contentGetEntriesByType } from '@helpers/content';
import type { IsContentItem, RoomDefinition } from '@interfaces';

let roleCache: Map<string, string> | undefined = undefined;

function buildRoleCache(): Map<string, string> {
  const rooms = contentGetEntriesByType<RoomDefinition & IsContentItem>('room');
  const map = new Map<string, string>();
  for (const room of rooms) {
    if (room.role) {
      map.set(room.role, room.id);
    }
  }
  return map;
}

export function roomRoleFindById(role: string): string | undefined {
  if (!roleCache) {
    roleCache = buildRoleCache();
  }
  return roleCache.get(role);
}

export function roomRoleResetCache(): void {
  roleCache = undefined;
}
