import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import {
  moraleCurrent,
  moraleEventLog,
  moraleIsRetreating,
  MORALE_MAX,
} from '@helpers';
import type { MoraleEvent } from '@interfaces/morale';

@Component({
  selector: 'app-morale-bar',
  imports: [NgClass],
  host: {
    class: 'block pointer-events-auto',
  },
  template: `
    @if (isVisible()) {
      <div class="morale-container w-70 px-2 py-1.5 backdrop-blur-sm rounded-lg opacity-70 hover:opacity-100 transition-opacity duration-200">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold">Invader Morale</span>
          <span class="text-xs" [ngClass]="valueLabelClass()">
            {{ moraleCurrent() }}/{{ moraleMax }}
          </span>
        </div>

        <div
          class="relative cursor-default"
          (mouseenter)="showLog.set(true)"
          (mouseleave)="showLog.set(false)"
        >
          <progress
            class="progress w-full h-3"
            [ngClass]="progressClass()"
            [value]="moraleCurrent()"
            [max]="moraleMax"
          ></progress>

          @if (moraleIsRetreating()) {
            <div class="badge badge-error badge-xs absolute -top-2 right-0">
              RETREATING
            </div>
          }
        </div>

        @if (latestEvent(); as evt) {
          <div class="morale-float-text text-xs font-semibold mt-0.5" [ngClass]="floatTextClass()">
            {{ evt.delta > 0 ? '+' : '' }}{{ evt.delta }} {{ evt.description }}
          </div>
        }

        @if (showLog() && eventLog().length > 0) {
          <div class="morale-log absolute bottom-full left-0 z-100 min-w-[220px] max-w-[300px] max-h-[200px] overflow-y-auto p-3 mb-1 rounded-lg">
            <div class="text-xs font-semibold mb-1">Morale Log</div>
            @for (evt of eventLog(); track $index) {
              <div class="flex justify-between text-xs gap-2">
                <span class="opacity-60">Turn {{ evt.turn }}</span>
                <span class="flex-1 truncate">{{ evt.description }}</span>
                <span
                  [class.text-error]="evt.delta < 0"
                  [class.text-success]="evt.delta > 0"
                >
                  {{ evt.delta > 0 ? '+' : '' }}{{ evt.delta }}
                </span>
                <span class="opacity-40">{{ evt.newValue }}</span>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    .morale-container {
      background: color-mix(in oklch, var(--color-base-200) 80%, transparent);
    }

    .morale-float-text {
      animation: morale-fade 2s ease-out forwards;
    }

    .morale-log {
      background: oklch(var(--b3));
      border: 1px solid oklch(var(--bc) / 0.15);
      box-shadow: 0 4px 12px oklch(0 0 0 / 0.3);
    }

    @keyframes morale-fade {
      0% {
        opacity: 1;
      }
      70% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoraleBarComponent {
  public readonly moraleMax = MORALE_MAX;
  public readonly moraleCurrent = moraleCurrent;
  public readonly moraleIsRetreating = moraleIsRetreating;

  public showLog = signal(false);

  public isVisible = computed(() => {
    const log = moraleEventLog();
    return moraleCurrent() < MORALE_MAX || log.length > 0;
  });

  public eventLog = computed(() => {
    return [...moraleEventLog()].reverse();
  });

  public latestEvent = computed((): MoraleEvent | undefined => {
    const log = moraleEventLog();
    return log.length > 0 ? log[log.length - 1] : undefined;
  });

  public progressClass = computed(() => {
    const value = moraleCurrent();
    if (value < 30) return 'progress-error';
    if (value <= 60) return 'progress-warning';
    return 'progress-success';
  });

  public valueLabelClass = computed(() => {
    const value = moraleCurrent();
    if (value < 30) return 'text-error';
    if (value <= 60) return 'text-warning';
    return 'text-success';
  });

  public floatTextClass = computed(() => {
    const evt = this.latestEvent();
    if (!evt) return '';
    return evt.delta < 0 ? 'text-error' : 'text-success';
  });
}
