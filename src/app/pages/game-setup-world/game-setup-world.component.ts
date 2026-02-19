import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SFXDirective } from '@directives/sfx.directive';
import { biomeIsUnlocked, discordSetStatus, gameReset, worldSetSeed } from '@helpers';
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

  private static readonly ALL_BIOME_TYPES: BiomeType[] = [
    'neutral',
    'volcanic',
    'flooded',
    'crystal',
    'corrupted',
    'fungal',
  ];

  public biomeOptions = computed<BiomeOption[]>(() => {
    const unlocked: BiomeOption[] = GameSetupWorldComponent.ALL_BIOME_TYPES
      .filter((type) => biomeIsUnlocked(type))
      .map((type) => ({
        value: type,
        name: BIOME_DATA[type].name,
        description: BIOME_DATA[type].description,
        color: BIOME_DATA[type].color,
      }));

    return [
      {
        value: 'random' as BiomeSelection,
        name: 'Random',
        description: 'Let fate decide your dungeon\'s environment.',
        color: '#9ca3af',
      },
      ...unlocked,
    ];
  });

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
