import { Component, inject } from '@angular/core';
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
            const { default: Swal } = await import('sweetalert2');
            const swalResult = await Swal.fire({
              title: 'Newer Save Version',
              text: result.error,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Try to Load Anyway',
              cancelButtonText: 'Cancel',
            });

            if (swalResult.isConfirmed) {
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
