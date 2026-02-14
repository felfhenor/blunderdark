export type MoraleEventType =
  | 'ally_death'
  | 'trap_trigger'
  | 'high_fear_room'
  | 'room_capture';

export type MoraleEvent = {
  turn: number;
  eventType: MoraleEventType;
  delta: number;
  newValue: number;
  description: string;
};
