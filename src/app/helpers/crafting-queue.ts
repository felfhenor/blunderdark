import { contentGetEntry } from '@helpers/content';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type { PlacedRoom } from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';

export function craftingQueueGetMaxSize(room: PlacedRoom): number {
  const def = contentGetEntry<RoomContent>(room.roomTypeId);
  const base = def?.queueSize ?? 0;
  if (base === 0) return 0;

  const effects = roomUpgradeGetAppliedEffects(room);
  let additive = 0;
  let multiplier = 1;
  for (const effect of effects) {
    if (effect.type === 'craftingQueueSize') additive += effect.value;
    if (effect.type === 'craftingQueueMultiplier') multiplier *= effect.value;
  }

  return Math.floor((base + additive) * multiplier);
}
