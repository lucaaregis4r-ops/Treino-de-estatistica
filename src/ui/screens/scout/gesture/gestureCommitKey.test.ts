import { describe, expect, it } from 'vitest';
import { shouldCommitGestureKey } from './gestureCommitKey';

describe('shouldCommitGestureKey', () => {
  it('accepts a single Enter only while idle', () => {
    expect(shouldCommitGestureKey('Enter', false, false)).toBe(true);
    expect(shouldCommitGestureKey('Enter', true, false)).toBe(false);
    expect(shouldCommitGestureKey('Enter', false, true)).toBe(false);
    expect(shouldCommitGestureKey('Escape', false, false)).toBe(false);
  });
});
