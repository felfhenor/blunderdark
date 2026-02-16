import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  model,
} from '@angular/core';
import { ModalComponent } from '@components/modal/modal.component';
import { contentGetEntriesByType } from '@helpers/content';
import {
  seasonalEventActiveEffects,
  seasonalEventDismiss,
  seasonalEventMakeChoice,
  seasonalEventPending,
} from '@helpers/seasonal-event';
import { seasonGetLabel } from '@helpers/season';
import type { SeasonalEventContent, EventEffect, EventChoice } from '@interfaces/content-seasonalevent';

@Component({
  selector: 'app-panel-seasonal-event',
  imports: [ModalComponent],
  templateUrl: './panel-seasonal-event.component.html',
  styleUrl: './panel-seasonal-event.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSeasonalEventComponent {
  public visible = model<boolean>(false);

  public pending = seasonalEventPending;
  public activeEffects = seasonalEventActiveEffects;

  public hasActiveEffects = computed(() => this.activeEffects().length > 0);

  public pendingEvent = computed((): SeasonalEventContent | undefined => {
    const p = this.pending();
    if (!p) return undefined;
    const allEvents = contentGetEntriesByType<SeasonalEventContent>('seasonalevent');
    return allEvents.find((e) => e.id === p.eventId);
  });

  public eventSeasonLabel = computed(() => {
    const event = this.pendingEvent();
    if (!event) return '';
    return seasonGetLabel(event.season);
  });

  public isChoiceEvent = computed(() => {
    const event = this.pendingEvent();
    return (event?.choices.length ?? 0) > 0;
  });

  constructor() {
    effect(() => {
      const p = this.pending();
      if (p) {
        this.visible.set(true);
      }
    });
  }

  public async dismiss(): Promise<void> {
    await seasonalEventDismiss();
    this.visible.set(false);
  }

  public async makeChoice(index: number): Promise<void> {
    await seasonalEventMakeChoice(index);
    this.visible.set(false);
  }

  public formatEffectDescription(effect: EventEffect): string {
    return effect.description;
  }

  public formatChoiceEffects(choice: EventChoice): string {
    return choice.effects.map((e) => e.description).join(', ');
  }

  public getEffectBadgeClass(effect: EventEffect): string {
    switch (effect.type) {
      case 'resource_gain':
        return 'badge-success';
      case 'resource_loss':
        return 'badge-error';
      case 'production_modifier':
        return effect.multiplier && effect.multiplier >= 1
          ? 'badge-info'
          : 'badge-warning';
    }
  }
}
