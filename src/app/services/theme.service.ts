import { effect, Injectable } from '@angular/core';
import { optionsGet, uiWindowHeight, uiWindowWidth } from '@helpers';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  constructor() {
    effect(() => {
      const theme = optionsGet('uiTheme');
      document.documentElement.setAttribute('data-theme', theme);
    });
  }

  private handleResize() {
    uiWindowWidth.set(window.innerWidth);
    uiWindowHeight.set(window.innerHeight);
  }

  init() {
    this.handleResize();

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }
}
