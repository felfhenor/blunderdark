import { signal } from '@angular/core';
import type { VersionInfo } from '@interfaces';

export const versionLocal = signal<VersionInfo | undefined>(undefined);
export const versionLive = signal<VersionInfo | undefined>(undefined);

export function versionInfoToSemver(versionInfo: VersionInfo) {
  if (versionInfo.distance >= 0 && versionInfo.tag) {
    return `${versionInfo.tag} (${versionInfo.raw})`;
  }

  return (
    versionInfo.tag ||
    versionInfo.semverString ||
    versionInfo.raw ||
    versionInfo.hash
  );
}
