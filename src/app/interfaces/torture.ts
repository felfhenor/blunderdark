export type TortureExtractionCompleteEvent = {
  roomId: string;
  prisonerName: string;
  researchGained: number;
};

export type TortureConversionCompleteEvent = {
  roomId: string;
  prisonerName: string;
  success: boolean;
  inhabitantName?: string;
};
