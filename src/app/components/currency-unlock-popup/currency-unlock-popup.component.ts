import {
  ChangeDetectionStrategy,
  Component,
  effect,
  untracked,
  viewChild,
} from '@angular/core';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { currencyUnlockQueue } from '@helpers/currency-unlock';
import {
  ICON_ALL,
  RESOURCE_DISPLAY,
  RESOURCE_ICON_MAP,
  RESOURCE_COLOR_MAP,
  RESOURCE_LABEL_MAP,
} from '@helpers';
import type { ResourceType } from '@interfaces';

@Component({
  selector: 'app-currency-unlock-popup',
  imports: [SweetAlert2Module],
  template: `
    <swal
      #unlockSwal
      [showConfirmButton]="true"
      confirmButtonText="Got it!"
    ></swal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyUnlockPopupComponent {
  private unlockSwal = viewChild<SwalComponent>('unlockSwal');

  private processing = false;

  constructor() {
    effect(() => {
      const queue = currencyUnlockQueue();
      if (queue.length === 0) return;

      untracked(() => {
        if (!this.processing) {
          this.processQueue();
        }
      });
    });
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (currencyUnlockQueue().length > 0) {
      const queue = currencyUnlockQueue();
      const type = queue[0];
      currencyUnlockQueue.set(queue.slice(1));

      await this.showPopup(type);
    }

    this.processing = false;
  }

  private async showPopup(type: ResourceType): Promise<void> {
    const swal = this.unlockSwal();
    if (!swal) return;

    const label = RESOURCE_LABEL_MAP[type];
    const description =
      RESOURCE_DISPLAY.find((r) => r.type === type)?.description ?? '';
    const iconSvg = ICON_ALL[RESOURCE_ICON_MAP[type]];
    const color = RESOURCE_COLOR_MAP[type];

    swal.swalOptions = {
      title: `${label} Unlocked!`,
      html: `<div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
        <div style="width:3rem;height:3rem;color:${color};">${iconSvg}</div>
        <p style="opacity:0.8;font-size:0.875rem;">${description}</p>
        <p style="opacity:0.6;font-size:0.75rem;">This resource now appears in your resource bar and will be produced by your dungeon.</p>
      </div>`,
      confirmButtonText: 'Got it!',
    };

    await swal.fire();
  }
}
