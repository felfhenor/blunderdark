import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  clearPreviewPosition,
  deselectTile,
  executeRoomPlacement,
  exitPlacementMode,
  gamestate,
  notifyError,
  placementPreview,
  placementPreviewShape,
  selectedTile,
  selectTile,
  updatePreviewPosition,
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
  public placementPreview = placementPreview;

  private previewTileSet = computed(() => {
    const preview = this.placementPreview();
    if (!preview) return null;
    const set = new Set<string>();
    for (const t of preview.tiles) {
      if (t.inBounds) {
        set.add(`${t.x},${t.y}`);
      }
    }
    return { set, valid: preview.valid };
  });

  public isSelected(x: number, y: number): boolean {
    const sel = this.selectedTile();
    return sel?.x === x && sel?.y === y;
  }

  public isPreviewValid(x: number, y: number): boolean {
    const data = this.previewTileSet();
    return data !== null && data.valid && data.set.has(`${x},${y}`);
  }

  public isPreviewInvalid(x: number, y: number): boolean {
    const data = this.previewTileSet();
    return data !== null && !data.valid && data.set.has(`${x},${y}`);
  }

  public async onTileClick(x: number, y: number): Promise<void> {
    if (placementPreviewShape()) {
      const result = await executeRoomPlacement(x, y);
      if (!result.success && result.error) {
        notifyError(result.error);
      }
      return;
    }
    selectTile(x, y);
  }

  public onTileHover(x: number, y: number): void {
    if (placementPreviewShape()) {
      updatePreviewPosition(x, y);
    }
  }

  public onGridLeave(): void {
    if (placementPreviewShape()) {
      clearPreviewPosition();
    }
  }

  public onRightClick(event: MouseEvent): void {
    if (placementPreviewShape()) {
      event.preventDefault();
      exitPlacementMode();
    }
  }

  public onEscapeKey(): void {
    if (placementPreviewShape()) {
      exitPlacementMode();
    } else {
      deselectTile();
    }
  }
}
