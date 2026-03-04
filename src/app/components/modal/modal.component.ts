import { NgClass } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { ButtonCloseComponent } from '@components/button-close/button-close.component';
import { tutorialIsActive } from '@helpers/tutorial';
import { uiModalOpenCount } from '@helpers/ui';

@Component({
  selector: 'app-modal',
  imports: [ButtonCloseComponent, NgClass],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  host: {
    '(document:keydown.escape)': 'onEscapeKey($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  public visible = model<boolean>(false);

  public allowEscToClose = input<boolean>(true);
  public showCloseButton = input<boolean>(false);
  public widthClass = input<string>('max-w-3xl');

  public modalClose = output<void>();

  public modal = viewChild<ElementRef<HTMLDialogElement>>('modal');

  private destroyRef = inject(DestroyRef);
  private trackedOpen = false;

  constructor() {
    effect(() => {
      const visible = this.visible();
      if (!visible) {
        this.closeModal();
        return;
      }

      this.trackedOpen = true;
      uiModalOpenCount.update((c) => c + 1);
      this.modal()?.nativeElement.show();
    });

    this.destroyRef.onDestroy(() => {
      if (this.trackedOpen) {
        uiModalOpenCount.update((c) => Math.max(0, c - 1));
        this.trackedOpen = false;
      }
    });
  }

  public onBackdropClick(event: MouseEvent): void {
    if (event.target !== this.modal()?.nativeElement) return;
    if (!this.allowEscToClose()) return;
    this.closeModal();
  }

  public onEscapeKey(event: Event): void {
    if (tutorialIsActive()) return;
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
      this.trackedOpen = false;
      uiModalOpenCount.update((c) => Math.max(0, c - 1));
      this.modalClose.emit();
    }
  }
}
