import type { SelectedStyle } from './types';

export interface StoredSelectedStyle extends SelectedStyle {
  assignedColor?: {
    id: string;
    name: string;
    hex: string;
  };
}

const selectionStore = new Map<string, StoredSelectedStyle[]>();

function cloneStyles(styles: StoredSelectedStyle[]): StoredSelectedStyle[] {
  return styles.map((style) => ({
    ...style,
    assignedColor: style.assignedColor ? { ...style.assignedColor } : undefined,
  }));
}

export function getStoredSelectedStyles(sessionId: string | undefined): StoredSelectedStyle[] {
  if (!sessionId) {
    return [];
  }

  const styles = selectionStore.get(sessionId) ?? [];
  return cloneStyles(styles);
}

export function setStoredSelectedStyles(
  sessionId: string | undefined,
  styles: StoredSelectedStyle[],
): void {
  if (!sessionId) {
    return;
  }

  selectionStore.set(sessionId, cloneStyles(styles));
}

export function clearStoredSelectedStyles(sessionId: string | undefined): void {
  if (!sessionId) {
    return;
  }

  selectionStore.delete(sessionId);
}
