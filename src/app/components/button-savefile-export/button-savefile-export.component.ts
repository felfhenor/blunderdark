import { Component } from '@angular/core';
import { AnalyticsClickDirective } from '@directives/analytics-click.directive';
import { SFXDirective } from '@directives/sfx.directive';
import { saveSerialize, notifySuccess, notifyError } from '@helpers';

@Component({
  selector: 'app-button-savefile-export',
  imports: [AnalyticsClickDirective, SFXDirective],
  templateUrl: './button-savefile-export.component.html',
  styleUrl: './button-savefile-export.component.scss',
})
export class ButtonSavefileExportComponent {
  exportSavefile() {
    try {
      const saveData = saveSerialize();

      const fileName = `${Date.now()}.grdh`;
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(saveData));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', fileName);
      downloadAnchorNode.click();

      notifySuccess('Game exported successfully!');
    } catch {
      notifyError('Failed to export save file.');
    }
  }
}
