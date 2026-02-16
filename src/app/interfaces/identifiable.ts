export type ContentType =
  | 'abilityeffect'
  | 'alchemyrecipe'
  | 'breedingrecipe'
  | 'combatability'
  | 'feature'
  | 'forgerecipe'
  | 'fusionrecipe'
  | 'inhabitant'
  | 'invader'
  | 'invasion'
  | 'merchanttrade'
  | 'reputationaction'
  | 'reputationeffect'
  | 'research'
  | 'room'
  | 'roomshape'
  | 'seasonalevent'
  | 'seasonbonus'
  | 'summonrecipe'
  | 'synergy'
  | 'trap'
  | 'victorypath';

export interface Identifiable {
  id: string;
  name: string;
}

export type IsContentItem = Identifiable & {
  __type: ContentType;
};

declare const __brand: unique symbol;

export type Branded<T, K> = T & {
  readonly [__brand]: K;
};
