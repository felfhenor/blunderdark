import { describe, expect, it } from 'vitest';
import type { VersionInfo } from '@interfaces';
import { versionInfoToSemver } from '@helpers/version';

function makeVersion(overrides: Partial<VersionInfo> = {}): VersionInfo {
  return {
    dirty: false,
    raw: 'v1.2.3-4-gabcdef0',
    hash: 'abcdef0',
    distance: -1,
    tag: '',
    semver: '1.2.3',
    suffix: '',
    semverString: '1.2.3',
    ...overrides,
  };
}

describe('versionInfoToSemver', () => {
  it('should return tag with raw when distance >= 0 and tag is set', () => {
    const result = versionInfoToSemver(
      makeVersion({ tag: 'v1.2.3', distance: 4, raw: 'v1.2.3-4-gabcdef0' }),
    );
    expect(result).toBe('v1.2.3 (v1.2.3-4-gabcdef0)');
  });

  it('should return tag with raw when distance is 0 (exact tag)', () => {
    const result = versionInfoToSemver(
      makeVersion({ tag: 'v1.0.0', distance: 0, raw: 'v1.0.0' }),
    );
    expect(result).toBe('v1.0.0 (v1.0.0)');
  });

  it('should return tag when distance is negative', () => {
    const result = versionInfoToSemver(
      makeVersion({ tag: 'v2.0.0', distance: -1 }),
    );
    expect(result).toBe('v2.0.0');
  });

  it('should return semverString when no tag is set', () => {
    const result = versionInfoToSemver(
      makeVersion({ tag: '', semverString: '1.2.3' }),
    );
    expect(result).toBe('1.2.3');
  });

  it('should return raw when no tag or semverString', () => {
    const result = versionInfoToSemver(
      makeVersion({ tag: '', semverString: '', raw: 'abcdef0' }),
    );
    expect(result).toBe('abcdef0');
  });

  it('should return hash as last fallback', () => {
    const result = versionInfoToSemver(
      makeVersion({ tag: '', semverString: '', raw: '', hash: 'deadbeef' }),
    );
    expect(result).toBe('deadbeef');
  });
});
