import { getEntriesByType } from '@helpers/content';
import type { IsContentItem, RoomDefinition } from '@interfaces';

let roleCache: Map<string, string> | undefined = undefined;

function buildRoleCache(): Map<string, string> {
  const rooms = getEntriesByType<RoomDefinition & IsContentItem>('room');
  const map = new Map<string, string>();
  for (const room of rooms) {
    if (room.role) {
      map.set(room.role, room.id);
    }
  }
  return map;
}

export function findRoomIdByRole(role: string): string | undefined {
  if (!roleCache) {
    roleCache = buildRoleCache();
  }
  return roleCache.get(role);
}

export function resetRoleCache(): void {
  roleCache = undefined;
}
