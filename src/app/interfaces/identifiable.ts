export type ContentType =
  | 'abilityeffect'
  | 'alchemyrecipe'
  | 'breedingrecipe'
  | 'combatability'
  | 'forgerecipe'
  | 'fusionrecipe'
  | 'inhabitant'
  | 'invader'
  | 'invasion'
  | 'reputationaction'
  | 'reputationeffect'
  | 'research'
  | 'room'
  | 'roomshape'
  | 'seasonbonus'
  | 'summonrecipe'
  | 'synergy'
  | 'trap';

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
