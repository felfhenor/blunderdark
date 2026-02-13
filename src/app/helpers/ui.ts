import { computed, signal } from '@angular/core';

export function uiIsPageVisible(): boolean {
  return !document.hidden;
}

export const uiWindowHeight = signal<number>(window.innerHeight);
export const uiWindowWidth = signal<number>(window.innerWidth);

export const uiShowAnySubmenu = signal<boolean>(false);

export const uiShowOptionsMenu = signal<boolean>(false);

export const uiModalOpenCount = signal<number>(0);

export const uiIsAnyModalOpen = computed(() => uiModalOpenCount() > 0);

export const uiIsShowingAnyMenu = computed(() => uiShowOptionsMenu());

export function uiCloseAllMenus(smart = false) {
  if (smart && uiShowAnySubmenu()) {
    uiShowAnySubmenu.set(false);
    return;
  }

  uiShowAnySubmenu.set(false);
  uiShowOptionsMenu.set(false);
}
