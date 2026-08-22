export interface ShortcutKeyboardEvent {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
}

export function matchesShortcut(event: ShortcutKeyboardEvent, shortcut: string): boolean {
  const parts = shortcut
    .toLocaleLowerCase()
    .split('+')
    .map((part) => part.trim());
  const key = parts.at(-1);
  return (
    event.key.toLocaleLowerCase() === key &&
    event.altKey === parts.includes('alt') &&
    event.ctrlKey === parts.includes('ctrl') &&
    event.shiftKey === parts.includes('shift') &&
    event.metaKey === parts.includes('meta')
  );
}
