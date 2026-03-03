import { contentGetEntry } from '@helpers/content';
import { floorCurrentBiome } from '@helpers/floor';
import { gamestate } from '@helpers/state-game';
import { optionsGet } from '@helpers/state-options';
import { tutorialIsActive } from '@helpers/tutorial';
import { victoryAchievedPathId } from '@helpers/victory';
import type { DiscordPresenceOpts } from '@interfaces';
import type { ResearchContent } from '@interfaces/content-research';
import type { VictoryPathContent } from '@interfaces/content-victorypath';

export function discordIsInElectron() {
  return navigator.userAgent.toLowerCase().includes(' electron/');
}

let discordMainStatus = '';
export function discordSetMainStatus(status: string) {
  discordMainStatus = status;
}

export function discordSetStatus(status: DiscordPresenceOpts) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).discordRPCStatus = {
    ...status,
    details: discordMainStatus || status.details,
  };
}

function dungeonSummary(state: ReturnType<typeof gamestate>): string {
  const floors = state.world.floors.length;
  const rooms = state.world.floors.reduce(
    (sum, f) => sum + f.rooms.length,
    0,
  );
  const creatures = state.world.inhabitants.length;
  return `${floors} floors, ${rooms} rooms, ${creatures} creatures`;
}

export function discordUpdateStatus() {
  if (!discordIsInElectron()) return;

  const state = gamestate();
  const summary = dungeonSummary(state);

  // Tutorial active
  if (tutorialIsActive()) {
    discordSetStatus({ state: 'Learning the ropes' });
    return;
  }

  // Victory achieved
  const victoryPathId = victoryAchievedPathId();
  if (victoryPathId) {
    const path = contentGetEntry<VictoryPathContent>(victoryPathId);
    discordSetStatus({
      state: 'Victorious!',
      details: path?.name,
    });
    return;
  }

  // Invasion active
  if (state.world.activeInvasion) {
    discordSetStatus({
      state: 'Defending against invaders!',
      details: summary,
    });
    return;
  }

  // Paused
  if (optionsGet('gameloopPaused')) {
    discordSetStatus({ state: 'Paused', details: summary });
    return;
  }

  // Researching
  const researchId = state.world.research.activeResearch;
  if (researchId) {
    const research = contentGetEntry<ResearchContent>(researchId);
    if (research) {
      discordSetStatus({
        state: `Researching ${research.name}...`,
        details: summary,
      });
      return;
    }
  }

  // Default in-game
  const biome = floorCurrentBiome();
  const biomeLabel = biome.charAt(0).toUpperCase() + biome.slice(1);
  discordSetStatus({
    state: `Day ${state.clock.day} | ${biomeLabel} Dungeon`,
    details: summary,
  });
}
