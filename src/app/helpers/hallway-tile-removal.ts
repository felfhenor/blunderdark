import { connectionRemoveRoomFromFloor } from '@helpers/connections';
import { floorCurrent } from '@helpers/floor';
import { gridGetTile } from '@helpers/grid';
import { hallwayRemove, hallwayRemoveFromGrid } from '@helpers/hallways';
import { updateGamestate } from '@helpers/state-game';
import type { PlacedRoomId } from '@interfaces';

/**
 * Remove an entire hallway starting from a tile at (x, y).
 * Looks up the hallwayId from the grid tile, then removes all tiles
 * belonging to that hallway and deletes the hallway from the floor.
 */
export async function hallwayTileRemove(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const floor = floorCurrent();
  if (!floor) return { success: false, error: 'No active floor' };

  const tile = gridGetTile(floor.grid, x, y);
  if (!tile || tile.occupiedBy !== 'hallway' || !tile.hallwayId) {
    return { success: false, error: 'No hallway tile at this position' };
  }

  const hallwayId = tile.hallwayId;
  const hallway = floor.hallways.find((h) => h.id === hallwayId);
  if (!hallway) {
    return { success: false, error: 'Hallway not found' };
  }

  await updateGamestate((state) => {
    const floorIndex = state.world.currentFloorIndex;
    const currentFloor = state.world.floors[floorIndex];
    if (!currentFloor) return state;

    const updatedGrid = hallwayRemoveFromGrid(currentFloor.grid, hallway);
    const updatedHallways = hallwayRemove(currentFloor.hallways, hallwayId);

    const floorWithoutConnections = connectionRemoveRoomFromFloor(currentFloor, hallwayId as PlacedRoomId);

    const updatedFloors = [...state.world.floors];
    updatedFloors[floorIndex] = {
      ...currentFloor,
      grid: updatedGrid,
      hallways: updatedHallways,
      connections: floorWithoutConnections.connections,
    };

    return {
      ...state,
      world: {
        ...state.world,
        floors: updatedFloors,
      },
    };
  });

  return { success: true };
}
