import { species } from 'fantastical';
import { rngChoice } from '@helpers/rng';
import type { InhabitantCreatureType } from '@interfaces/content-inhabitant';

const genders = ['male', 'female'] as const;
const randomGender = () => rngChoice([...genders]);

const typeToGenerators: Record<InhabitantCreatureType, Array<() => string>> = {
  creature: [species.goblin, species.orc],
  undead: [() => species.darkelf(randomGender())],
  ooze: [species.ogre],
  dragon: [() => species.dragon(randomGender())],
  demon: [species.demon],
  fungal: [() => species.fairy(randomGender())],
  aberration: [() => species.halfdemon(randomGender())],
};

const fallbackGenerators: Array<() => string> = [species.human];

export function generateInhabitantName(type: InhabitantCreatureType): string {
  const generators = typeToGenerators[type] ?? fallbackGenerators;
  const generator = rngChoice(generators);
  return generator();
}
