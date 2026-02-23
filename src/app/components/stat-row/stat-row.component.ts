import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import type { CombatStats } from '@interfaces/combat-stats';

type StatRowStats = CombatStats & { workerEfficiency?: number };

function statHighlight(
  current: number | undefined,
  base: number | undefined,
): 'high' | 'low' | undefined {
  if (base === undefined || current === undefined || current === base)
    return undefined;
  return current > base ? 'high' : 'low';
}

@Component({
  selector: 'app-stat-row',
  imports: [StatNameComponent],
  host: {
    class: 'inline-flex gap-1.5 font-mono',
  },
  template: `
    <app-stat-name type="hp" [value]="stats().hp" [prefix]="prefix()" [highlight]="highlights().hp" />
    <app-stat-name type="attack" [value]="stats().attack" [prefix]="prefix()" [highlight]="highlights().attack" />
    <app-stat-name type="defense" [value]="stats().defense" [prefix]="prefix()" [highlight]="highlights().defense" />
    <app-stat-name type="speed" [value]="stats().speed" [prefix]="prefix()" [highlight]="highlights().speed" />
    @if (showWorkerEfficiency() && stats().workerEfficiency !== undefined) {
      <app-stat-name
        type="workerEfficiency"
        [value]="stats().workerEfficiency!"
        suffix="x"
        [prefix]="prefix()"
        [highlight]="highlights().workerEfficiency"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatRowComponent {
  public stats = input.required<StatRowStats>();
  public baseStats = input<StatRowStats>();
  public showWorkerEfficiency = input(true);
  public prefix = input('');

  public highlights = computed(() => {
    const current = this.stats();
    const base = this.baseStats();
    return {
      hp: statHighlight(current.hp, base?.hp),
      attack: statHighlight(current.attack, base?.attack),
      defense: statHighlight(current.defense, base?.defense),
      speed: statHighlight(current.speed, base?.speed),
      workerEfficiency: statHighlight(
        current.workerEfficiency,
        base?.workerEfficiency,
      ),
    };
  });
}
