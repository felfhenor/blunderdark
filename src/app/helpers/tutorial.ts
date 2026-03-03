import { computed, signal } from '@angular/core';
import { optionsGet, optionsSet } from '@helpers/state-options';
import { TUTORIAL_STEPS } from '@helpers/tutorial-steps';

const _tutorialActive = signal(false);
const _tutorialStepIndex = signal(0);

export const tutorialIsActive = computed(() => _tutorialActive());
export const tutorialStepIndex = computed(() => _tutorialStepIndex());
export const tutorialCurrentStep = computed(() =>
  _tutorialActive() ? TUTORIAL_STEPS[_tutorialStepIndex()] : undefined,
);
export const tutorialTotalSteps = TUTORIAL_STEPS.length;

export function tutorialStart(): void {
  _tutorialStepIndex.set(0);
  _tutorialActive.set(true);
}

export function tutorialBack(): void {
  const prevIndex = _tutorialStepIndex() - 1;
  if (prevIndex >= 0) {
    _tutorialStepIndex.set(prevIndex);
  }
}

export function tutorialNext(): void {
  const nextIndex = _tutorialStepIndex() + 1;
  if (nextIndex >= TUTORIAL_STEPS.length) {
    tutorialComplete();
  } else {
    _tutorialStepIndex.set(nextIndex);
  }
}

export function tutorialSkip(): void {
  tutorialComplete();
}

export function tutorialComplete(): void {
  _tutorialActive.set(false);
  _tutorialStepIndex.set(0);
  optionsSet('tutorialCompleted', true);
}

export function tutorialAutoStart(): void {
  if (!optionsGet('tutorialCompleted')) {
    tutorialStart();
  }
}
