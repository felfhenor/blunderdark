import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsClickDirective } from '@directives/analytics-click.directive';
import { SFXDirective } from '@directives/sfx.directive';
import {
  uiCloseAllMenus,
  notifySuccess,
  notifyError,
  saveParseLegacy,
  saveValidate,
  saveDeserialize,
} from '@helpers';

@Component({
  selector: 'app-button-savefile-import',
  imports: [AnalyticsClickDirective, SFXDirective],
  templateUrl: './button-savefile-import.component.html',
  styleUrl: './button-savefile-import.component.scss',
})
export class ButtonSavefileImportComponent {
  private router = inject(Router);

  importSavefile(e: Event) {
    const fileInput = e.target as HTMLInputElement;
    if (!e || !e.target || !fileInput.files) {
      return;
    }

    const file = fileInput.files[0];

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(
          (ev.target as FileReader).result as string,
        ) as unknown;

        const saveData = saveParseLegacy(raw);
        if (!saveData) {
          notifyError('Unrecognized save file format.');
          fileInput.value = '';
          return;
        }

        const validation = saveValidate(saveData);
        if (!validation.valid) {
          notifyError(
            `Invalid save file: ${validation.errors[0]}`,
          );
          fileInput.value = '';
          return;
        }

        if (validation.warnings.length > 0) {
          // Warn but allow proceeding
          for (const warning of validation.warnings) {
            notifyError(warning);
          }
        }

        saveDeserialize(saveData);
        uiCloseAllMenus();

        fileInput.value = '';

        notifySuccess('Successfully imported savefile!');

        this.router.navigate(['/game']);
      } catch {
        notifyError('Failed to parse save file.');
        fileInput.value = '';
      }
    };

    reader.readAsText(file);
  }
}
