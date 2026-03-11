import { signal } from '@angular/core';

/**
 * Cross-component signal for navigating the roster panel to a specific inhabitant.
 * Set this to an inhabitant instance ID to open the roster and select that inhabitant.
 * Consumers should clear this after handling.
 */
export const rosterNavigateToInhabitant = signal<string | undefined>(undefined);
