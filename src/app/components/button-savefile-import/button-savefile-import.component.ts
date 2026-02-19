import { Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsClickDirective } from '@directives/analytics-click.directive';
import { SFXDirective } from '@directives/sfx.directive';
import {
  uiCloseAllMenus,
  notifySuccess,
  notifyError,
  notifyWarning,
  saveParseLegacy,
  saveValidate,
  saveDeserialize,
  saveDeserializeForceLoad,
} from '@helpers';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-button-savefile-import',
  imports: [AnalyticsClickDirective, SFXDirective, SweetAlert2Module],
  templateUrl: './button-savefile-import.component.html',
  styleUrl: './button-savefile-import.component.scss',
})
export class ButtonSavefileImportComponent {
  private router = inject(Router);
  private newerVersionSwal = viewChild<SwalComponent>('newerVersionSwal');
  public newerVersionText = signal('');

  importSavefile(e: Event) {
    const fileInput = e.target as HTMLInputElement;
    if (!e || !e.target || !fileInput.files) {
      return;
    }

    const file = fileInput.files[0];

    const reader = new FileReader();
    reader.onload = async (ev) => {
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

        const result = saveDeserialize(saveData);

        if (!result.success) {
          if (result.isNewerVersion) {
            this.newerVersionText.set(
              result.error ?? 'This save is from a newer game version.',
            );
            const swalResult = await this.newerVersionSwal()?.fire();

            if (swalResult?.isConfirmed) {
              try {
                saveDeserializeForceLoad(saveData);
                notifyWarning('Loaded save from newer version — some data may be lost.');
              } catch {
                notifyError('Failed to load incompatible save file.');
                fileInput.value = '';
                return;
              }
            } else {
              fileInput.value = '';
              return;
            }
          } else {
            notifyError(result.error ?? 'Save file is incompatible or corrupted.');
            fileInput.value = '';
            return;
          }
        }

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
