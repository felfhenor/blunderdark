import { signal } from '@angular/core';
import { debug } from '@helpers/logging';
import { saveSerialize } from '@helpers/save';
import {
  saveSlotStorageDelete,
  saveSlotStorageGet,
  saveSlotStoragePut,
} from '@helpers/save-slots-storage';
import { gamestate } from '@helpers/state-game';
import type { SaveData, SaveSlotId, SaveSlotMeta, SaveSlotMetaIndex } from '@interfaces';

// --- Constants ---

export const SAVE_SLOT_IDS: SaveSlotId[] = ['autosave', 'slot-1', 'slot-2', 'slot-3'];
export const SAVE_SLOT_MANUAL_IDS: SaveSlotId[] = ['slot-1', 'slot-2', 'slot-3'];

const SAVE_SLOT_KEY_PREFIX = 'saveslot:';
const SAVE_SLOT_META_KEY = 'saveslot-meta';

// --- State ---

export const saveSlotMetaIndex = signal<SaveSlotMetaIndex>(saveSlotDefaultMetaIndex());

// --- Pure functions ---

export function saveSlotDefaultMeta(slotId: SaveSlotId): SaveSlotMeta {
  return {
    slotId,
    timestamp: 0,
    dungeonName: '',
    playtimeSeconds: 0,
    floorCount: 0,
    roomCount: 0,
    dayNumber: 0,
    isEmpty: true,
  };
}

export function saveSlotDefaultMetaIndex(): SaveSlotMetaIndex {
  return {
    autosave: saveSlotDefaultMeta('autosave'),
    'slot-1': saveSlotDefaultMeta('slot-1'),
    'slot-2': saveSlotDefaultMeta('slot-2'),
    'slot-3': saveSlotDefaultMeta('slot-3'),
  };
}

export function saveSlotExtractMeta(slotId: SaveSlotId, saveData: SaveData): SaveSlotMeta {
  const gs = saveData.gameState;
  const totalRooms = gs.world.floors.reduce(
    (sum, floor) => sum + floor.rooms.length,
    0,
  );

  return {
    slotId,
    timestamp: saveData.savedAt,
    dungeonName: gs.gameId,
    playtimeSeconds: saveData.playtimeSeconds,
    floorCount: gs.world.floors.length,
    roomCount: totalRooms,
    dayNumber: gs.clock.day,
    isEmpty: false,
  };
}

export function saveSlotDbKey(slotId: SaveSlotId): string {
  return `${SAVE_SLOT_KEY_PREFIX}${slotId}`;
}

export function saveSlotIsManual(slotId: SaveSlotId): boolean {
  return slotId !== 'autosave';
}

export function saveSlotDisplayName(slotId: SaveSlotId): string {
  switch (slotId) {
    case 'autosave':
      return 'Autosave';
    case 'slot-1':
      return 'Slot 1';
    case 'slot-2':
      return 'Slot 2';
    case 'slot-3':
      return 'Slot 3';
  }
}

// --- Public async operations ---

export async function saveSlotWrite(slotId: SaveSlotId, saveData?: SaveData): Promise<void> {
  const data = saveData ?? saveSerialize(gamestate());
  const key = saveSlotDbKey(slotId);

  await saveSlotStoragePut(key, data);

  const meta = saveSlotExtractMeta(slotId, data);
  const metaIndex =
    (await saveSlotStorageGet<SaveSlotMetaIndex>(SAVE_SLOT_META_KEY)) ??
    saveSlotDefaultMetaIndex();
  metaIndex[slotId] = meta;
  await saveSlotStoragePut(SAVE_SLOT_META_KEY, metaIndex);

  saveSlotMetaIndex.set(metaIndex);
  debug('SaveSlot', `Saved to ${saveSlotDisplayName(slotId)}`);
}

export async function saveSlotRead(slotId: SaveSlotId): Promise<SaveData | undefined> {
  const key = saveSlotDbKey(slotId);
  return saveSlotStorageGet<SaveData>(key);
}

export async function saveSlotDelete(slotId: SaveSlotId): Promise<void> {
  const key = saveSlotDbKey(slotId);

  await saveSlotStorageDelete(key);

  const metaIndex =
    (await saveSlotStorageGet<SaveSlotMetaIndex>(SAVE_SLOT_META_KEY)) ??
    saveSlotDefaultMetaIndex();
  metaIndex[slotId] = saveSlotDefaultMeta(slotId);
  await saveSlotStoragePut(SAVE_SLOT_META_KEY, metaIndex);

  saveSlotMetaIndex.set(metaIndex);
  debug('SaveSlot', `Deleted ${saveSlotDisplayName(slotId)}`);
}

export async function saveSlotRefreshMeta(): Promise<SaveSlotMetaIndex> {
  const metaIndex =
    (await saveSlotStorageGet<SaveSlotMetaIndex>(SAVE_SLOT_META_KEY)) ??
    saveSlotDefaultMetaIndex();
  saveSlotMetaIndex.set(metaIndex);
  return metaIndex;
}

export async function saveSlotEstimateStorage(): Promise<{
  usedBytes: number;
  quotaBytes: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usedBytes: estimate.usage ?? 0,
      quotaBytes: estimate.quota ?? 0,
    };
  }

  return { usedBytes: 0, quotaBytes: 0 };
}
