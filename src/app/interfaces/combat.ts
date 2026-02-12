export type CombatUnit = {
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
};

export type CombatResult = {
  hit: boolean;
  roll: number;
  damage: number;
  defenderHp: number;
  defenderDead: boolean;
};
