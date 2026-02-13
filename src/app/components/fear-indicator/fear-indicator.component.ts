import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  fearLevelBreakdownMap,
  fearLevelGetLabel,
} from '@helpers';
import type { FearLevelBreakdown } from '@helpers/fear-level';

const TOOLTIP_DELAY_MS = 250;

@Component({
  selector: 'app-fear-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fearLevel() > 0) {
      <span
        class="fear-badge"
        [class]="fearClass()"
        (mouseenter)="onMouseEnter($event)"
        (mouseleave)="onMouseLeave()"
      >
        {{ fearLabel() }}
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-block;
        position: relative;
      }

      .fear-badge {
        display: inline-flex;
        align-items: center;
        font-size: 9px;
        font-weight: 700;
        padding: 0 3px;
        border-radius: 3px;
        line-height: 14px;
        white-space: nowrap;
        cursor: default;
      }

      .fear-low {
        background-color: oklch(0.45 0.15 145);
        color: oklch(0.9 0.05 145);
      }

      .fear-medium {
        background-color: oklch(0.45 0.15 80);
        color: oklch(0.9 0.05 80);
      }

      .fear-high {
        background-color: oklch(0.45 0.15 40);
        color: oklch(0.9 0.05 40);
      }

      .fear-very-high {
        background-color: oklch(0.4 0.15 25);
        color: oklch(0.9 0.05 25);
      }

    `,
  ],
})
export class FearIndicatorComponent {
  public roomId = input.required<string>();

  private document = inject(DOCUMENT);

  public breakdown = computed<FearLevelBreakdown | undefined>(() =>
    fearLevelBreakdownMap().get(this.roomId()),
  );

  public fearLevel = computed(() => this.breakdown()?.effectiveFear ?? 0);

  public fearLabel = computed(() => fearLevelGetLabel(this.fearLevel()));

  public fearClass = computed(() => {
    switch (this.fearLevel()) {
      case 1:
        return 'fear-low';
      case 2:
        return 'fear-medium';
      case 3:
        return 'fear-high';
      case 4:
        return 'fear-very-high';
      default:
        return '';
    }
  });

  private fearEffect = computed(() => {
    switch (this.fearLevel()) {
      case 1:
        return 'Low fear: minor unease';
      case 2:
        return 'Medium fear: some inhabitants may be scared';
      case 3:
        return 'High fear: scared inhabitants produce -50%';
      case 4:
        return 'Very High fear: most inhabitants scared';
      default:
        return '';
    }
  });

  private tooltipTimer: ReturnType<typeof setTimeout> | undefined;
  private tooltipEl: HTMLElement | undefined;

  public onMouseEnter(event: MouseEvent): void {
    this.clearTimer();
    const badge = event.currentTarget as HTMLElement;
    this.tooltipTimer = setTimeout(() => {
      this.showTooltipAt(badge);
    }, TOOLTIP_DELAY_MS);
  }

  public onMouseLeave(): void {
    this.clearTimer();
    this.removeTooltip();
  }

  private showTooltipAt(badge: HTMLElement): void {
    this.removeTooltip();

    const b = this.breakdown();
    if (!b) return;

    const el = this.document.createElement('div');
    el.style.cssText =
      'position:fixed;z-index:9999;background:oklch(0.2 0.01 260);border:1px solid oklch(0.35 0.02 260);border-radius:6px;padding:8px;min-width:160px;box-shadow:0 4px 12px rgba(0,0,0,0.5);pointer-events:none;font-family:inherit;color:white;';

    const lines: string[] = [];
    lines.push(
      `<div style="font-weight:600;font-size:12px;margin-bottom:4px">Fear: ${this.fearLabel()} (${b.effectiveFear})</div>`,
    );
    lines.push(
      `<div style="font-size:10px;opacity:0.7">Base: ${b.baseFear}</div>`,
    );
    if (b.inhabitantModifier !== 0) {
      const color = b.inhabitantModifier > 0 ? 'oklch(0.7 0.2 25)' : 'oklch(0.7 0.2 145)';
      const sign = b.inhabitantModifier > 0 ? '+' : '';
      lines.push(
        `<div style="font-size:10px;color:${color}">Inhabitants: ${sign}${b.inhabitantModifier}</div>`,
      );
    }
    if (b.upgradeAdjustment !== 0) {
      const color = b.upgradeAdjustment > 0 ? 'oklch(0.7 0.2 25)' : 'oklch(0.7 0.2 145)';
      const sign = b.upgradeAdjustment > 0 ? '+' : '';
      lines.push(
        `<div style="font-size:10px;color:${color}">Upgrades: ${sign}${b.upgradeAdjustment}</div>`,
      );
    }
    if (b.altarAuraReduction !== 0) {
      lines.push(
        `<div style="font-size:10px;color:oklch(0.7 0.2 145)">Altar Aura: -${b.altarAuraReduction}</div>`,
      );
    }
    if (b.propagatedFear !== 0) {
      lines.push(
        `<div style="font-size:10px;color:oklch(0.7 0.2 25)">Adjacent: +${b.propagatedFear}</div>`,
      );
      for (const source of b.propagationSources) {
        lines.push(
          `<div style="font-size:10px;opacity:0.5;margin-left:8px">+${source.amount} from ${source.sourceRoomName}</div>`,
        );
      }
    }
    lines.push('<hr style="border-color:oklch(0.35 0.02 260);margin:4px 0">');
    lines.push(
      `<div style="font-size:10px;opacity:0.6">${this.fearEffect()}</div>`,
    );

    el.innerHTML = lines.join('');

    this.document.body.appendChild(el);
    this.tooltipEl = el;

    const rect = badge.getBoundingClientRect();
    el.style.top = `${rect.bottom + 4}px`;
    el.style.left = `${rect.left}px`;
  }

  private removeTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = undefined;
    }
  }

  private clearTimer(): void {
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
      this.tooltipTimer = undefined;
    }
  }
}
