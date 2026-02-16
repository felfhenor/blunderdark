import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OptionsBaseComponent } from '@components/panel-options/option-base-page.component';
import { autosaveReset } from '@helpers/autosave';
import type { AutosaveInterval } from '@interfaces';

@Component({
  selector: 'app-panel-options-ui',
  imports: [FormsModule, TitleCasePipe, DecimalPipe],
  templateUrl: './panel-options-ui.component.html',
  styleUrl: './panel-options-ui.component.scss',
})
export class PanelOptionsUIComponent extends OptionsBaseComponent {
  public currentTheme = signal<string>(this.optionsGet('uiTheme') as string);

  public readonly autosaveIntervals: { value: AutosaveInterval; label: string }[] = [
    { value: 1, label: '1 minute' },
    { value: 3, label: '3 minutes' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
  ];

  toggleAutosave(): void {
    const enabled = !this.optionsGet('autosaveEnabled');
    this.optionsSet('autosaveEnabled', enabled);
    autosaveReset();
  }

  setAutosaveInterval(value: AutosaveInterval): void {
    this.optionsSet('autosaveIntervalMinutes', value);
    autosaveReset();
  }

  public readonly themes = [
    { name: 'acid', type: 'light' },
    { name: 'autumn', type: 'light' },
    {
      name: 'black',
      type: 'dark',
    },
    { name: 'bumblebee', type: 'light' },
    {
      name: 'business',
      type: 'dark',
    },
    {
      name: 'coffee',
      type: 'dark',
    },
    { name: 'cmyk', type: 'light' },
    { name: 'corporate', type: 'light' },
    { name: 'cupcake', type: 'light' },
    { name: 'cyberpunk', type: 'light' },
    {
      name: 'dark',
      type: 'dark',
    },
    {
      name: 'dim',
      type: 'dark',
    },
    {
      name: 'dracula',
      type: 'dark',
    },
    { name: 'emerald', type: 'light' },
    { name: 'fantasy', type: 'light' },
    {
      name: 'forest',
      type: 'dark',
    },
    { name: 'garden', type: 'light' },
    {
      name: 'halloween',
      type: 'dark',
    },
    { name: 'lemonade', type: 'light' },
    { name: 'light', type: 'light' },
    { name: 'lofi', type: 'light' },
    {
      name: 'luxury',
      type: 'dark',
    },
    {
      name: 'night',
      type: 'dark',
    },
    { name: 'nord', type: 'light' },
    { name: 'pastel', type: 'light' },
    { name: 'retro', type: 'light' },
    {
      name: 'sunset',
      type: 'dark',
    },
    { name: 'synthwave', type: 'dark' },
    { name: 'valentine', type: 'light' },
    { name: 'winter', type: 'light' },
    { name: 'wireframe', type: 'light' },
  ].filter((t) => t.type !== 'light');
}
