import { computed, signal } from '@angular/core';
import { GRID_SIZE } from '@interfaces/grid';

// Layout constants
const CAMERA_TILE_SIZE = 64;
const CAMERA_GAP_SIZE = 1;
export const CAMERA_GRID_TOTAL =
  GRID_SIZE * CAMERA_TILE_SIZE + (GRID_SIZE - 1) * CAMERA_GAP_SIZE;

// Zoom limits
const CAMERA_MAX_ZOOM = 3;
const CAMERA_HARD_MIN_ZOOM = 0.3;

// Pan speed (pixels per key press)
export const CAMERA_PAN_SPEED = 40;

// Zoom step per wheel tick
export const CAMERA_ZOOM_STEP = 0.15;

// State signals
export const cameraPosition = signal({ x: 0, y: 0 });
export const cameraZoom = signal(1);
export const cameraViewportSize = signal({ width: 0, height: 0 });
export const cameraIsAnimating = signal(false);

// Effective minimum zoom: fit the entire grid in the viewport
export const cameraEffectiveMinZoom = computed(() => {
  const vp = cameraViewportSize();
  if (vp.width === 0 || vp.height === 0) return 0.5;
  const fitZoom = Math.min(
    vp.width / CAMERA_GRID_TOTAL,
    vp.height / CAMERA_GRID_TOTAL,
  );
  return Math.max(CAMERA_HARD_MIN_ZOOM, fitZoom);
});

// CSS transform string for the grid container
export const cameraTransform = computed(() => {
  const pos = cameraPosition();
  const zoom = cameraZoom();
  return `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`;
});

// Clamp position so the grid stays visible within the viewport
function cameraClampPosition(
  x: number,
  y: number,
  zoom: number,
): { x: number; y: number } {
  const vp = cameraViewportSize();
  if (vp.width === 0 || vp.height === 0) return { x, y };

  const scaledWidth = CAMERA_GRID_TOTAL * zoom;
  const scaledHeight = CAMERA_GRID_TOTAL * zoom;

  if (scaledWidth <= vp.width) {
    x = (vp.width - scaledWidth) / 2;
  } else {
    x = Math.max(vp.width - scaledWidth, Math.min(0, x));
  }

  if (scaledHeight <= vp.height) {
    y = (vp.height - scaledHeight) / 2;
  } else {
    y = Math.max(vp.height - scaledHeight, Math.min(0, y));
  }

  return { x, y };
}

export function cameraPan(dx: number, dy: number): void {
  const pos = cameraPosition();
  const zoom = cameraZoom();
  const clamped = cameraClampPosition(pos.x + dx, pos.y + dy, zoom);
  cameraPosition.set(clamped);
}

export function cameraZoomAt(
  delta: number,
  cursorX: number,
  cursorY: number,
): void {
  const oldZoom = cameraZoom();
  const minZoom = cameraEffectiveMinZoom();
  const newZoom = Math.max(
    minZoom,
    Math.min(CAMERA_MAX_ZOOM, oldZoom + delta),
  );

  if (newZoom === oldZoom) return;

  const pos = cameraPosition();

  // Zoom centered on cursor position within the viewport.
  // The grid-space point under the cursor should remain under it after zoom.
  const gridX = (cursorX - pos.x) / oldZoom;
  const gridY = (cursorY - pos.y) / oldZoom;

  const newX = cursorX - gridX * newZoom;
  const newY = cursorY - gridY * newZoom;

  const clamped = cameraClampPosition(newX, newY, newZoom);

  cameraZoom.set(newZoom);
  cameraPosition.set(clamped);
}

export function cameraReset(): void {
  const vp = cameraViewportSize();
  const targetZoom = 1;
  const scaledWidth = CAMERA_GRID_TOTAL * targetZoom;
  const scaledHeight = CAMERA_GRID_TOTAL * targetZoom;

  const targetX = (vp.width - scaledWidth) / 2;
  const targetY = (vp.height - scaledHeight) / 2;

  cameraIsAnimating.set(true);
  cameraZoom.set(targetZoom);
  cameraPosition.set(cameraClampPosition(targetX, targetY, targetZoom));

  setTimeout(() => cameraIsAnimating.set(false), 300);
}

export function cameraInit(
  viewportWidth: number,
  viewportHeight: number,
): void {
  cameraViewportSize.set({ width: viewportWidth, height: viewportHeight });
  cameraIsAnimating.set(false);
  cameraZoom.set(1);

  const x = (viewportWidth - CAMERA_GRID_TOTAL) / 2;
  const y = (viewportHeight - CAMERA_GRID_TOTAL) / 2;

  cameraPosition.set(cameraClampPosition(x, y, 1));
}

export function cameraUpdateViewport(
  viewportWidth: number,
  viewportHeight: number,
): void {
  cameraViewportSize.set({ width: viewportWidth, height: viewportHeight });
  // Re-clamp position after viewport resize
  const pos = cameraPosition();
  const zoom = cameraZoom();
  cameraPosition.set(cameraClampPosition(pos.x, pos.y, zoom));
}
