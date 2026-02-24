import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-mutation-outcome-text',
  template: `
    @switch (outcome()) {
      @case ('positive') {
        <p class="text-success mt-2">Positive mutation! Stats improved.</p>
      }
      @case ('neutral') {
        <p class="text-warning mt-2">
          Neutral mutation. No significant change.
        </p>
      }
      @case ('negative') {
        <p class="text-error mt-2">Negative mutation. Stats decreased.</p>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationOutcomeTextComponent {
  public outcome = input.required<string>();
}
