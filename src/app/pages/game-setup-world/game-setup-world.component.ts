import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SFXDirective } from '@directives/sfx.directive';
import { discordSetStatus, gameReset, worldSetSeed } from '@helpers';
import { worldSetStartingBiome } from '@helpers/world';
import { BIOME_DATA, type BiomeType } from '@interfaces/biome';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

type BiomeSelection = BiomeType | 'random';

type BiomeOption = {
  value: BiomeSelection;
  name: string;
  description: string;
  color: string;
};

@Component({
  selector: 'app-game-setup-world',
  imports: [SweetAlert2Module, SFXDirective, FormsModule],
  templateUrl: './game-setup-world.component.html',
  styleUrl: './game-setup-world.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameSetupWorldComponent implements OnInit {
  private router = inject(Router);

  public worldSeed = signal<string | undefined>(undefined);
  public selectedBiome = signal<BiomeSelection>('neutral');

  // Biome options for the UI - includes all biomes plus random
  public readonly biomeOptions: BiomeOption[] = [
    {
      value: 'random',
      name: 'Random',
      description: 'Let fate decide your dungeon\'s environment.',
      color: '#9ca3af',
    },
    {
      value: 'neutral',
      name: BIOME_DATA.neutral.name,
      description: BIOME_DATA.neutral.description,
      color: BIOME_DATA.neutral.color,
    },
    {
      value: 'volcanic',
      name: BIOME_DATA.volcanic.name,
      description: BIOME_DATA.volcanic.description,
      color: BIOME_DATA.volcanic.color,
    },
    {
      value: 'flooded',
      name: BIOME_DATA.flooded.name,
      description: BIOME_DATA.flooded.description,
      color: BIOME_DATA.flooded.color,
    },
    {
      value: 'crystal',
      name: BIOME_DATA.crystal.name,
      description: BIOME_DATA.crystal.description,
      color: BIOME_DATA.crystal.color,
    },
    {
      value: 'corrupted',
      name: BIOME_DATA.corrupted.name,
      description: BIOME_DATA.corrupted.description,
      color: BIOME_DATA.corrupted.color,
    },
    {
      value: 'fungal',
      name: BIOME_DATA.fungal.name,
      description: BIOME_DATA.fungal.description,
      color: BIOME_DATA.fungal.color,
    },
  ];

  ngOnInit() {
    discordSetStatus({
      state: 'Starting a new game...',
    });
  }

  public selectBiome(biome: BiomeSelection): void {
    this.selectedBiome.set(biome);
  }

  public async createWorld() {
    gameReset();
    worldSetSeed(this.worldSeed());
    worldSetStartingBiome(this.selectedBiome());

    await this.router.navigate(['/setup', 'generate']);
  }
}
