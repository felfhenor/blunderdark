export type ElevatorInstance = {
  id: string;
  connectedFloors: number[]; // sorted array of contiguous floor depths
  gridX: number;
  gridY: number;
};
