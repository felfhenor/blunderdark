import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-blank-slate',
  imports: [],
  templateUrl: './blank-slate.component.html',
  styleUrl: './blank-slate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlankSlateComponent {}
