import type { Signal } from '@angular/core';
import { signal } from '@angular/core';
import type { ContentType, IsContentItem } from '@interfaces';

const _allIdsByName = signal<Map<string, string>>(new Map());
export const contentAllIdsByName: Signal<Map<string, string>> =
  _allIdsByName.asReadonly();

const _allContentById = signal<Map<string, IsContentItem>>(new Map());
export const contentAllById: Signal<Map<string, Readonly<IsContentItem>>> =
  _allContentById.asReadonly();

export function contentSetAllIdsByName(state: Map<string, string>): void {
  _allIdsByName.set(new Map(state));
}

export function contentSetAllById(state: Map<string, IsContentItem>): void {
  _allContentById.set(new Map(state));
}

export function contentGetEntriesByType<T>(type: ContentType): T[] {
  return (
    [...contentAllById()]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, entry]) => entry.__type === type)
      .map((e) => e[1]) as T[]
  );
}

export function contentGetEntry<T extends IsContentItem>(
  entryIdOrName: string,
): T | undefined {
  if (!entryIdOrName) return undefined;

  const idHash = contentAllIdsByName();
  const entriesHash = contentAllById();

  let ret: T = entriesHash.get(entryIdOrName) as T;

  const nameToId = idHash.get(entryIdOrName);
  if (nameToId) {
    ret = entriesHash.get(nameToId) as T;
  }

  return ret;
}
