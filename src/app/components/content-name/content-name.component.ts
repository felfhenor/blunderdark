import { Component, computed, input } from '@angular/core';
import { contentGetEntry } from '@helpers';

@Component({
  selector: 'app-content-name',
  imports: [],
  templateUrl: './content-name.component.html',
  styleUrl: './content-name.component.scss',
})
export class ContentNameComponent {
  public id = input.required<string>();

  public display = computed(() => contentGetEntry(this.id())?.name ?? 'UNKNOWN!');
}
