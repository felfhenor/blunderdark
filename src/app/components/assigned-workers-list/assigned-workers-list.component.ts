import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import type { AssignedInhabitantEntry } from '@interfaces/assignment';

@Component({
  selector: 'app-assigned-workers-list',
  imports: [InhabitantCardComponent, LowerCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (workers().length > 0) {
      <div class="divider my-2 text-xs opacity-60">{{ label() }}</div>
      <div class="flex flex-col gap-2">
        @for (w of workers(); track w.instance.instanceId) {
          <app-inhabitant-card
            [instance]="w.instance"
            [definition]="w.def"
            [compact]="true"
            [showAssignment]="false"
          />
        }
      </div>
    } @else {
      <p class="text-xs opacity-50 mt-2">No {{ label() | lowercase }} assigned.</p>
    }
  `,
})
export class AssignedWorkersListComponent {
  workers = input.required<AssignedInhabitantEntry[]>();
  label = input('Workers');
}
