import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalComponent } from '@components/modal/modal.component';
import { TabBarComponent } from '@components/tab-bar/tab-bar.component';
import type { TabDefinition } from '@components/tab-bar/tab-bar.component';
import { SFXDirective } from '@directives/sfx.directive';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { tablerPackage } from '@ng-icons/tabler-icons';
import { TippyDirective } from '@ngneat/helipopper';
import { MetaService } from '@services/meta.service';

@Component({
  selector: 'app-modal-changelog',
  imports: [NgIconComponent, TippyDirective, SFXDirective, ModalComponent, TabBarComponent],
  providers: [provideIcons({ tablerPackage })],
  templateUrl: './modal-changelog.component.html',
  styleUrl: './modal-changelog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalChangelogComponent {
  private meta = inject(MetaService);
  private sanitizer = inject(DomSanitizer);

  public readonly color = '#089000';
  public currentColor = '#ccc';

  public showChangelog = signal<boolean>(false);
  public currentView = signal<string>('recent');

  public readonly tabDefs: TabDefinition[] = [
    { id: 'recent', label: 'Recent' },
    { id: 'all', label: 'All' },
  ];

  public text = computed(() =>
    this.currentView() === 'recent'
      ? this.meta.changelogCurrent()
      : this.meta.changelogAll(),
  );
  public safeHtml = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.text()),
  );
}
