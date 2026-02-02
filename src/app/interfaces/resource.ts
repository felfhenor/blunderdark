export type ResourceType =
  | 'crystals'
  | 'food'
  | 'gold'
  | 'flux'
  | 'research'
  | 'essence'
  | 'corruption';

export type ResourceState = {
  current: number;
  max: number;
};

export type ResourceMap = Record<ResourceType, ResourceState>;
