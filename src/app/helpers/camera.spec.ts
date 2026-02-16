import { describe, it, expect, beforeEach } from 'vitest';
import {
  cameraPosition,
  cameraZoom,
  cameraViewportSize,
  cameraIsAnimating,
  cameraTransform,
  cameraEffectiveMinZoom,
  cameraPan,
  cameraZoomAt,
  cameraReset,
  cameraInit,
  cameraUpdateViewport,
  CAMERA_GRID_TOTAL,
  CAMERA_PAN_SPEED,
  CAMERA_ZOOM_STEP,
} from './camera';

describe('camera', () => {
  beforeEach(() => {
    cameraPosition.set({ x: 0, y: 0 });
    cameraZoom.set(1);
    cameraViewportSize.set({ width: 0, height: 0 });
    cameraIsAnimating.set(false);
  });

  describe('cameraInit', () => {
    it('should center the grid in the viewport', () => {
      cameraInit(1600, 1000);

      const pos = cameraPosition();
      const expectedX = (1600 - CAMERA_GRID_TOTAL) / 2;
      const expectedY = (1000 - CAMERA_GRID_TOTAL) / 2;

      expect(pos.x).toBeCloseTo(expectedX, 1);
      expect(pos.y).toBeCloseTo(expectedY, 1);
      expect(cameraZoom()).toBe(1);
    });

    it('should set viewport size', () => {
      cameraInit(800, 600);
      expect(cameraViewportSize()).toEqual({ width: 800, height: 600 });
    });

    it('should clear animating state', () => {
      cameraIsAnimating.set(true);
      cameraInit(800, 600);
      expect(cameraIsAnimating()).toBe(false);
    });
  });

  describe('cameraTransform', () => {
    it('should produce a CSS transform string', () => {
      cameraPosition.set({ x: 10, y: 20 });
      cameraZoom.set(1.5);

      expect(cameraTransform()).toBe('translate(10px, 20px) scale(1.5)');
    });
  });

  describe('cameraPan', () => {
    it('should move the camera by the given delta', () => {
      // Viewport smaller than grid so panning is not auto-centered
      cameraViewportSize.set({ width: 800, height: 600 });
      cameraPosition.set({ x: 0, y: 0 });
      cameraZoom.set(1);

      cameraPan(-50, -30);

      const pos = cameraPosition();
      expect(pos.x).toBe(-50);
      expect(pos.y).toBe(-30);
    });

    it('should clamp position to bounds', () => {
      cameraViewportSize.set({ width: 800, height: 600 });
      cameraZoom.set(1);
      cameraPosition.set({ x: 0, y: 0 });

      // Try to pan far past the right edge
      cameraPan(9999, 9999);

      const pos = cameraPosition();
      // When grid is larger than viewport, max x is 0
      expect(pos.x).toBeLessThanOrEqual(0);
    });
  });

  describe('cameraZoomAt', () => {
    it('should zoom in', () => {
      cameraViewportSize.set({ width: 1600, height: 1000 });
      cameraInit(1600, 1000);

      const oldZoom = cameraZoom();
      cameraZoomAt(CAMERA_ZOOM_STEP, 400, 300);

      expect(cameraZoom()).toBeGreaterThan(oldZoom);
    });

    it('should zoom out', () => {
      cameraViewportSize.set({ width: 1600, height: 1000 });
      cameraInit(1600, 1000);

      const oldZoom = cameraZoom();
      cameraZoomAt(-CAMERA_ZOOM_STEP, 400, 300);

      expect(cameraZoom()).toBeLessThan(oldZoom);
    });

    it('should not exceed max zoom (3x)', () => {
      cameraViewportSize.set({ width: 1600, height: 1000 });
      cameraZoom.set(2.95);

      cameraZoomAt(0.5, 400, 300);

      expect(cameraZoom()).toBe(3);
    });

    it('should not go below effective min zoom', () => {
      cameraViewportSize.set({ width: 1600, height: 1000 });
      cameraInit(1600, 1000);

      const minZoom = cameraEffectiveMinZoom();

      // Zoom out far
      for (let i = 0; i < 50; i++) {
        cameraZoomAt(-0.1, 400, 300);
      }

      expect(cameraZoom()).toBeCloseTo(minZoom, 5);
    });

    it('should maintain cursor position during zoom', () => {
      // Viewport smaller than grid so bounds clamping won't auto-center
      cameraViewportSize.set({ width: 800, height: 600 });
      cameraPosition.set({ x: -200, y: -200 });
      cameraZoom.set(1);

      const cursorX = 400;
      const cursorY = 300;

      // Grid point under cursor before zoom
      const posBefore = cameraPosition();
      const gridXBefore = (cursorX - posBefore.x) / 1;
      const gridYBefore = (cursorY - posBefore.y) / 1;

      cameraZoomAt(0.5, cursorX, cursorY);

      const pos = cameraPosition();
      const newZoom = cameraZoom();

      // Grid point under cursor after zoom should be the same
      const gridXAfter = (cursorX - pos.x) / newZoom;
      const gridYAfter = (cursorY - pos.y) / newZoom;

      expect(gridXAfter).toBeCloseTo(gridXBefore, 0);
      expect(gridYAfter).toBeCloseTo(gridYBefore, 0);
    });
  });

  describe('cameraEffectiveMinZoom', () => {
    it('should return a zoom that fits the grid in the viewport', () => {
      cameraViewportSize.set({ width: 800, height: 600 });
      const minZoom = cameraEffectiveMinZoom();

      // At this zoom, grid should fit in the smaller dimension
      const scaledHeight = CAMERA_GRID_TOTAL * minZoom;
      expect(scaledHeight).toBeLessThanOrEqual(600 + 1);
    });

    it('should not go below 0.3', () => {
      cameraViewportSize.set({ width: 100, height: 100 });
      expect(cameraEffectiveMinZoom()).toBe(0.3);
    });

    it('should default to 0.5 when viewport is 0', () => {
      cameraViewportSize.set({ width: 0, height: 0 });
      expect(cameraEffectiveMinZoom()).toBe(0.5);
    });
  });

  describe('cameraReset', () => {
    it('should set zoom to 1', () => {
      cameraViewportSize.set({ width: 1600, height: 1000 });
      cameraZoom.set(2);

      cameraReset();

      expect(cameraZoom()).toBe(1);
    });

    it('should center the grid', () => {
      cameraViewportSize.set({ width: 1600, height: 1000 });
      cameraPosition.set({ x: -500, y: -200 });

      cameraReset();

      const pos = cameraPosition();
      const expectedX = (1600 - CAMERA_GRID_TOTAL) / 2;
      const expectedY = (1000 - CAMERA_GRID_TOTAL) / 2;

      expect(pos.x).toBeCloseTo(expectedX, 1);
      expect(pos.y).toBeCloseTo(expectedY, 1);
    });

    it('should set animating flag', () => {
      cameraViewportSize.set({ width: 1600, height: 1000 });
      cameraReset();
      expect(cameraIsAnimating()).toBe(true);
    });
  });

  describe('cameraUpdateViewport', () => {
    it('should update viewport size', () => {
      cameraUpdateViewport(1200, 800);
      expect(cameraViewportSize()).toEqual({ width: 1200, height: 800 });
    });

    it('should re-clamp position after resize', () => {
      cameraViewportSize.set({ width: 2000, height: 2000 });
      cameraPosition.set({ x: 0, y: 0 });
      cameraZoom.set(1);

      // Shrink viewport — position should be re-clamped
      cameraUpdateViewport(500, 500);

      const pos = cameraPosition();
      expect(pos.x).toBeLessThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(0);
    });
  });

  describe('bounds enforcement', () => {
    it('should center grid when smaller than viewport', () => {
      cameraViewportSize.set({ width: 2000, height: 2000 });
      cameraZoom.set(1);

      cameraPan(0, 0);

      const pos = cameraPosition();
      const expectedX = (2000 - CAMERA_GRID_TOTAL) / 2;
      const expectedY = (2000 - CAMERA_GRID_TOTAL) / 2;

      expect(pos.x).toBeCloseTo(expectedX, 1);
      expect(pos.y).toBeCloseTo(expectedY, 1);
    });

    it('should not allow panning past left/top edge', () => {
      cameraViewportSize.set({ width: 800, height: 600 });
      cameraZoom.set(1);
      cameraPosition.set({ x: 0, y: 0 });

      cameraPan(999, 999);

      const pos = cameraPosition();
      expect(pos.x).toBeLessThanOrEqual(0);
      expect(pos.y).toBeLessThanOrEqual(0);
    });
  });

  describe('constants', () => {
    it('should have correct grid total', () => {
      // 20 tiles * 64px + 19 gaps * 1px = 1280 + 19 = 1299
      expect(CAMERA_GRID_TOTAL).toBe(1299);
    });

    it('should export PAN_SPEED', () => {
      expect(CAMERA_PAN_SPEED).toBe(40);
    });

    it('should export ZOOM_STEP', () => {
      expect(CAMERA_ZOOM_STEP).toBe(0.15);
    });
  });
});
