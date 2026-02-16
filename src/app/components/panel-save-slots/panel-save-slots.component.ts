import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  type OnInit,
} from '@angular/core';
import {
  saveSlotDelete,
  saveSlotDisplayName,
  saveSlotEstimateStorage,
  saveSlotMetaIndex,
  saveSlotRead,
  saveSlotRefreshMeta,
  saveSlotWrite,
  SAVE_SLOT_IDS,
  SAVE_SLOT_MANUAL_IDS,
} from '@helpers/save-slots';
import { saveDeserialize } from '@helpers/save';
import { notifyError, notifySuccess } from '@helpers/notify';
import type { SaveSlotId, SaveSlotMeta } from '@interfaces';

async function swalConfirm(opts: {
  title: string;
  text: string;
  icon: 'warning' | 'error';
  confirmButtonText: string;
}): Promise<boolean> {
  const { default: Swal } = await import('sweetalert2');
  const result = await Swal.fire({
    ...opts,
    showCancelButton: true,
    cancelButtonText: 'Cancel',
  });
  return result.isConfirmed;
}

@Component({
  selector: 'app-panel-save-slots',
  imports: [DatePipe],
  templateUrl: './panel-save-slots.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSaveSlotsComponent implements OnInit {
  public slotIds = SAVE_SLOT_IDS;
  public manualSlotIds = SAVE_SLOT_MANUAL_IDS;
  public metaIndex = saveSlotMetaIndex;
  public storageUsed = signal(0);
  public storageQuota = signal(0);
  public isBusy = signal(false);

  public storagePercent = computed(() => {
    const quota = this.storageQuota();
    if (quota <= 0) return 0;
    return Math.round((this.storageUsed() / quota) * 100);
  });

  public storageWarning = computed(() => this.storagePercent() > 80);

  async ngOnInit(): Promise<void> {
    await saveSlotRefreshMeta();
    await this.refreshStorage();
  }

  public slotDisplayName(slotId: SaveSlotId): string {
    return saveSlotDisplayName(slotId);
  }

  public isManualSlot(slotId: SaveSlotId): boolean {
    return slotId !== 'autosave';
  }

  public formatPlaytime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)} ${units[i]}`;
  }

  public async saveToSlot(slotId: SaveSlotId): Promise<void> {
    const meta = this.metaIndex()[slotId];

    if (!meta.isEmpty) {
      const confirmed = await swalConfirm({
        title: `Overwrite ${saveSlotDisplayName(slotId)}?`,
        text: 'This will replace the existing save data. This cannot be undone.',
        icon: 'warning',
        confirmButtonText: 'Overwrite',
      });
      if (!confirmed) return;
    }

    try {
      this.isBusy.set(true);
      await saveSlotWrite(slotId);
      notifySuccess(`Saved to ${saveSlotDisplayName(slotId)}`);
      await this.refreshStorage();
    } catch {
      notifyError(`Failed to save to ${saveSlotDisplayName(slotId)}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  public async loadFromSlot(slotId: SaveSlotId): Promise<void> {
    const confirmed = await swalConfirm({
      title: `Load ${saveSlotDisplayName(slotId)}?`,
      text: 'Your current unsaved progress will be lost.',
      icon: 'warning',
      confirmButtonText: 'Load',
    });
    if (!confirmed) return;

    try {
      this.isBusy.set(true);
      const saveData = await saveSlotRead(slotId);
      if (!saveData) {
        notifyError('Save slot is empty');
        return;
      }

      saveDeserialize(saveData);
      notifySuccess(`Loaded from ${saveSlotDisplayName(slotId)}`);
    } catch {
      notifyError(`Failed to load from ${saveSlotDisplayName(slotId)}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  public async deleteSlot(slotId: SaveSlotId): Promise<void> {
    if (slotId === 'autosave') return;

    const confirmed = await swalConfirm({
      title: `Delete ${saveSlotDisplayName(slotId)}?`,
      text: 'This save data will be permanently deleted.',
      icon: 'error',
      confirmButtonText: 'Delete',
    });
    if (!confirmed) return;

    try {
      this.isBusy.set(true);
      await saveSlotDelete(slotId);
      notifySuccess(`Deleted ${saveSlotDisplayName(slotId)}`);
      await this.refreshStorage();
    } catch {
      notifyError(`Failed to delete ${saveSlotDisplayName(slotId)}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  public slotMeta(slotId: SaveSlotId): SaveSlotMeta {
    return this.metaIndex()[slotId];
  }

  private async refreshStorage(): Promise<void> {
    const storage = await saveSlotEstimateStorage();
    this.storageUsed.set(storage.usedBytes);
    this.storageQuota.set(storage.quotaBytes);
  }
}
