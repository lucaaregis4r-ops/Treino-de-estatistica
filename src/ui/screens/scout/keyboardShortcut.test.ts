import { describe, expect, it } from 'vitest';
import { matchesShortcut } from './keyboardShortcut';

describe('matchesShortcut', () => {
  it('matches configured modifier chords and plain keys exactly', () => {
    expect(
      matchesShortcut(
        { key: 't', altKey: true, ctrlKey: false, shiftKey: false, metaKey: false },
        'Alt+T',
      ),
    ).toBe(true);
    expect(
      matchesShortcut(
        { key: 'ArrowUp', altKey: false, ctrlKey: false, shiftKey: false, metaKey: false },
        'ArrowUp',
      ),
    ).toBe(true);
    expect(
      matchesShortcut(
        { key: 't', altKey: false, ctrlKey: false, shiftKey: false, metaKey: false },
        'Alt+T',
      ),
    ).toBe(false);
  });
});
