import type { Routes } from '@angular/router';
import { GamePlayComponent } from '@pages/game-play/game-play.component';
import { GameResearchComponent } from '@pages/game-research/game-research.component';

export const gameRoutes: Routes = [
  {
    component: GamePlayComponent,
    path: '',
  },
  {
    component: GameResearchComponent,
    path: 'research',
  },
  {
    path: '**',
    pathMatch: 'full',
    redirectTo: '',
  },
];
