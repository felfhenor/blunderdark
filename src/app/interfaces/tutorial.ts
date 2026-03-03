export type TutorialTooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type TutorialStepDefinition = {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  tooltipPosition: TutorialTooltipPosition;
  panelToOpen?: string;
  modalToOpen?: string;
};
