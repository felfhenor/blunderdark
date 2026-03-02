import { describe, expect, it } from 'vitest';
import { formatMultiplierAsPercentage } from '@helpers/format';

describe('formatMultiplierAsPercentage', () => {
  it('should format 1.25 as +25%', () => {
    expect(formatMultiplierAsPercentage(1.25)).toBe('+25%');
  });

  it('should format 0.90 as -10%', () => {
    expect(formatMultiplierAsPercentage(0.9)).toBe('-10%');
  });

  it('should format 1.0 as +0%', () => {
    expect(formatMultiplierAsPercentage(1.0)).toBe('+0%');
  });

  it('should format 2.0 as +100%', () => {
    expect(formatMultiplierAsPercentage(2.0)).toBe('+100%');
  });

  it('should format 0.5 as -50%', () => {
    expect(formatMultiplierAsPercentage(0.5)).toBe('-50%');
  });

  it('should format 1.15 as +15%', () => {
    expect(formatMultiplierAsPercentage(1.15)).toBe('+15%');
  });

  it('should round fractional percentages', () => {
    expect(formatMultiplierAsPercentage(1.333)).toBe('+33%');
    expect(formatMultiplierAsPercentage(1.666)).toBe('+67%');
  });

  it('should handle 0 multiplier as -100%', () => {
    expect(formatMultiplierAsPercentage(0)).toBe('-100%');
  });
});
