import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  deselectTile,
  gamestate,
  selectedTile,
  selectTile,
} from '@helpers';

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class GridComponent {
  public grid = computed(() => gamestate().world.grid);
  public selectedTile = selectedTile;

  public isSelected(x: number, y: number): boolean {
    const sel = this.selectedTile();
    return sel?.x === x && sel?.y === y;
  }

  public onTileClick(x: number, y: number): void {
    selectTile(x, y);
  }

  public onEscapeKey(): void {
    deselectTile();
  }
}
