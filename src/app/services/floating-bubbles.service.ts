import { Injectable } from '@angular/core';

import {
  alchemyLabCompleted$,
  breedingCompleted$,
  darkForgeCompleted$,
  findRoomByRole,
  floatingBubblesEmitQueue,
  mutationCompleted$,
  optionsGet,
  researchCompleted$,
  spawningPoolSpawn$,
  summoningCompleted$,
  tortureBreakComplete$,
  tortureExtractComplete$,
  tortureInterrogateComplete$,
  trapWorkshopCompleted$,
} from '@helpers';

@Injectable({ providedIn: 'root' })
export class FloatingBubblesService {
  init(): void {
    spawningPoolSpawn$.subscribe((e) => {
      floatingBubblesEmitQueue(e.roomId, `+1 ${e.inhabitantName}`);
    });

    breedingCompleted$.subscribe((e) => {
      floatingBubblesEmitQueue(e.roomId, `+1 ${e.hybridName}`);
    });

    mutationCompleted$.subscribe((e) => {
      const label =
        e.outcome === 'positive'
          ? 'Mutation!'
          : e.outcome === 'negative'
            ? 'Mutation failed'
            : 'Neutral mutation';
      floatingBubblesEmitQueue(e.roomId, label);
    });

    alchemyLabCompleted$.subscribe((e) => {
      if (!optionsGet('showResourceGainBubbles')) return;
      floatingBubblesEmitQueue(
        e.roomId,
        `+${e.outputAmount} ${e.outputResource}`,
      );
    });

    darkForgeCompleted$.subscribe((e) => {
      floatingBubblesEmitQueue(e.roomId, `${e.recipeName}`);
    });

    summoningCompleted$.subscribe((e) => {
      floatingBubblesEmitQueue(e.roomId, `+1 ${e.inhabitantName}`);
    });

    tortureInterrogateComplete$.subscribe((e) => {
      floatingBubblesEmitQueue(e.roomId, 'Intel gathered');
    });

    tortureExtractComplete$.subscribe((e) => {
      if (e.action === 'research') {
        floatingBubblesEmitQueue(
          e.roomId,
          `+${e.researchGained} research`,
        );
      } else {
        floatingBubblesEmitQueue(e.roomId, 'Rune extracted');
      }
    });

    tortureBreakComplete$.subscribe((e) => {
      if (e.action === 'convert') {
        const text = e.success
          ? `+1 ${e.inhabitantName}`
          : 'Conversion failed';
        floatingBubblesEmitQueue(e.roomId, text);
      } else if (e.action === 'execute') {
        floatingBubblesEmitQueue(e.roomId, 'Executed');
      } else {
        floatingBubblesEmitQueue(e.roomId, 'Sacrificed');
      }
    });

    trapWorkshopCompleted$.subscribe((e) => {
      // Trap workshop event doesn't carry roomId; find it by role
      const found = findRoomByRole('trapWorkshop');
      if (found) {
        floatingBubblesEmitQueue(found.room.id, `+1 ${e.trapName}`);
      }
    });

    researchCompleted$.subscribe((e) => {
      // Research doesn't have a room; skip bubble for now
      // Could find research lab room if one exists
      void e;
    });
  }
}
