import type { TutorialStepDefinition } from '@interfaces';

export const TUTORIAL_STEPS: TutorialStepDefinition[] = [
  {
    id: 'welcome',
    targetSelector: 'app-grid',
    title: 'Welcome to Blunderdark!',
    description:
      'You are a dungeon overlord! Your goal is to build rooms, recruit creatures, and defend your dungeon from invaders. Let\u2019s take a quick tour.',
    tooltipPosition: 'bottom',
  },
  {
    id: 'resources',
    targetSelector: 'app-resource-bar-top',
    title: 'Resources',
    description:
      'This bar shows your resources. Gold, Mana, Stone, and more are earned over time and spent to build and recruit. Click any resource for a detailed breakdown.',
    tooltipPosition: 'bottom',
  },
  {
    id: 'dungeon',
    targetSelector: 'app-grid',
    title: 'Your Dungeon',
    description:
      'This is your dungeon grid. Rooms are placed here and connected by hallways. Click any room to see its details on the right side.',
    tooltipPosition: 'bottom',
  },
  {
    id: 'side-tabs',
    targetSelector: 'app-side-tab-rail',
    title: 'Side Tabs',
    description:
      'These tabs along the left edge open panels for building, managing your roster, and more. You can also press their hotkeys (shown on hover).',
    tooltipPosition: 'right',
  },
  {
    id: 'build-panel',
    targetSelector: '.panel-overlay',
    title: 'Build Panel',
    description:
      'The Build panel lets you construct new rooms and hallways. Each room type has a unique role \u2014 from resource production to creature training.',
    tooltipPosition: 'right',
    panelToOpen: 'build',
  },
  {
    id: 'altar-panel',
    targetSelector: '.panel-overlay',
    title: 'Altar Panel',
    description:
      'The Altar is where you recruit new creatures for your dungeon. Spend currency to summon inhabitants with unique traits and abilities.',
    tooltipPosition: 'right',
    panelToOpen: 'altar',
  },
  {
    id: 'roster-panel',
    targetSelector: '.panel-overlay',
    title: 'Roster Panel',
    description:
      'The Roster shows all your recruited creatures. Assign them to rooms to boost production or unlock special crafting stations.',
    tooltipPosition: 'right',
    panelToOpen: 'roster',
  },
  {
    id: 'research',
    targetSelector: 'app-game-research .modal-box',
    title: 'Research',
    description:
      'Research unlocks new rooms, upgrades, and abilities. Spend research points to progress through the tech trees and power up your dungeon.',
    tooltipPosition: 'bottom',
    modalToOpen: 'research',
  },
  {
    id: 'invasions',
    targetSelector: 'app-grid',
    title: 'Invasions',
    description:
      'Heroes will periodically invade your dungeon starting on Day 5! Traps, defenders, and room layouts all matter. Prepare well and reap the rewards of victory. Good luck, Overlord!',
    tooltipPosition: 'bottom',
  },
];
