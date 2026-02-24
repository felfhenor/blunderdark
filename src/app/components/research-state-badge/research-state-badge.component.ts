import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ResearchNodeState } from '@interfaces';

@Component({
  selector: 'app-research-state-badge',
  template: `
    @switch (state()) {
      @case ('completed') {
        <span class="badge badge-success badge-sm">Completed</span>
      }
      @case ('active') {
        <span class="badge badge-info badge-sm">In Progress</span>
      }
      @case ('available') {
        <span class="badge badge-warning badge-sm">Available</span>
      }
      @case ('locked') {
        <span class="badge badge-ghost badge-sm">Locked</span>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchStateBadgeComponent {
  public state = input.required<ResearchNodeState>();
}
