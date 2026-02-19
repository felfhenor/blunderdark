import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  viewChild,
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
import { saveDeserialize, saveDeserializeForceLoad } from '@helpers/save';
import { notifyError, notifySuccess, notifyWarning } from '@helpers/notify';
import type { SaveSlotId, SaveSlotMeta } from '@interfaces';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-save-slots',
  imports: [DatePipe, SweetAlert2Module],
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

  private overwriteSwal = viewChild<SwalComponent>('overwriteSwal');
  private loadSwal = viewChild<SwalComponent>('loadSwal');
  private newerVersionSwal = viewChild<SwalComponent>('newerVersionSwal');
  private deleteSwal = viewChild<SwalComponent>('deleteSwal');

  public pendingSlotName = signal('');
  public newerVersionText = signal('');

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
      this.pendingSlotName.set(saveSlotDisplayName(slotId));
      const result = await this.overwriteSwal()?.fire();
      if (!result?.isConfirmed) return;
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
    this.pendingSlotName.set(saveSlotDisplayName(slotId));
    const loadResult = await this.loadSwal()?.fire();
    if (!loadResult?.isConfirmed) return;

    try {
      this.isBusy.set(true);
      const saveData = await saveSlotRead(slotId);
      if (!saveData) {
        notifyError('Save slot is empty');
        return;
      }

      const result = saveDeserialize(saveData);

      if (!result.success) {
        if (result.isNewerVersion) {
          this.newerVersionText.set(
            result.error ?? 'This save is from a newer game version.',
          );
          const newerResult = await this.newerVersionSwal()?.fire();

          if (newerResult?.isConfirmed) {
            try {
              saveDeserializeForceLoad(saveData);
              notifyWarning('Loaded save from newer version — some data may be lost.');
            } catch {
              notifyError('Failed to load incompatible save file.');
              return;
            }
          } else {
            return;
          }
        } else {
          notifyError(result.error ?? 'Save file is incompatible or corrupted.');
          return;
        }
      } else {
        notifySuccess(`Loaded from ${saveSlotDisplayName(slotId)}`);
      }
    } catch {
      notifyError(`Failed to load from ${saveSlotDisplayName(slotId)}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  public async deleteSlot(slotId: SaveSlotId): Promise<void> {
    if (slotId === 'autosave') return;

    this.pendingSlotName.set(saveSlotDisplayName(slotId));
    const deleteResult = await this.deleteSwal()?.fire();
    if (!deleteResult?.isConfirmed) return;

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
