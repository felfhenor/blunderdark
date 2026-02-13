import { NgClass } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  Component,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { ButtonCloseComponent } from '@components/button-close/button-close.component';
import { uiModalOpenCount } from '@helpers/ui';

@Component({
  selector: 'app-modal',
  imports: [ButtonCloseComponent, NgClass],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  host: {
    '(document:keydown.escape)': 'onEscapeKey($event)',
  },
})
export class ModalComponent {
  public visible = model<boolean>(false);

  public allowEscToClose = input<boolean>(true);
  public showCloseButton = input<boolean>(false);
  public widthClass = input<string>('max-w-3xl');

  public modalClose = output<void>();

  public modal = viewChild<ElementRef<HTMLDialogElement>>('modal');

  constructor() {
    effect(() => {
      const visible = this.visible();
      if (!visible) {
        this.closeModal();
        return;
      }

      uiModalOpenCount.update((c) => c + 1);
      this.modal()?.nativeElement.show();
    });
  }

  public onEscapeKey(event: KeyboardEvent): void {
    if (!this.visible() || !this.allowEscToClose()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.closeModal();
  }

  public closeModal() {
    const wasVisible = this.modal()?.nativeElement.open;
    this.modal()?.nativeElement.close();
    this.visible.set(false);
    if (wasVisible) {
      uiModalOpenCount.update((c) => Math.max(0, c - 1));
    }
    this.modalClose.emit();
  }
}
