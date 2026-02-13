import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  moraleCurrent,
  moraleEventLog,
  moraleIsRetreating,
  MORALE_MAX,
} from '@helpers';
import type { MoraleEvent } from '@helpers/morale';

@Component({
  selector: 'app-morale-bar',
  imports: [],
  template: `
    @if (isVisible()) {
      <div class="morale-container">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold">Invader Morale</span>
          <span class="text-xs font-mono" [class]="valueLabelClass()">
            {{ moraleCurrent() }}/{{ moraleMax }}
          </span>
        </div>

        <div
          class="morale-bar-wrapper"
          (mouseenter)="showLog.set(true)"
          (mouseleave)="showLog.set(false)"
        >
          <progress
            class="progress w-full h-3"
            [class]="progressClass()"
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
          <div class="morale-float-text text-xs font-semibold mt-0.5" [class]="floatTextClass()">
            {{ evt.delta > 0 ? '+' : '' }}{{ evt.delta }} {{ evt.description }}
          </div>
        }

        @if (showLog() && eventLog().length > 0) {
          <div class="morale-log">
            <div class="text-xs font-semibold mb-1">Morale Log</div>
            @for (evt of eventLog(); track $index) {
              <div class="flex justify-between text-[10px] gap-2">
                <span class="opacity-60">Turn {{ evt.turn }}</span>
                <span class="flex-1 truncate">{{ evt.description }}</span>
                <span
                  class="font-mono"
                  [class.text-error]="evt.delta < 0"
                  [class.text-success]="evt.delta > 0"
                >
                  {{ evt.delta > 0 ? '+' : '' }}{{ evt.delta }}
                </span>
                <span class="opacity-40 font-mono">{{ evt.newValue }}</span>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .morale-container {
      padding: 0.5rem;
      background: oklch(var(--b2));
      border-radius: 0.5rem;
    }

    .morale-bar-wrapper {
      position: relative;
      cursor: default;
    }

    .morale-float-text {
      animation: morale-fade 2s ease-out forwards;
    }

    .morale-log {
      position: absolute;
      z-index: 100;
      min-width: 220px;
      max-width: 300px;
      max-height: 200px;
      overflow-y: auto;
      padding: 0.75rem;
      margin-top: 0.25rem;
      background: oklch(var(--b3));
      border: 1px solid oklch(var(--bc) / 0.15);
      border-radius: 0.5rem;
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
