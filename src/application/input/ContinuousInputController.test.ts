import { describe, expect, it } from 'vitest';
import { defaultCompactV1 } from '../../profiles/code/default-compact/defaultCompactV1';
import { dataVolleyBasicV1 } from '../../profiles/code/data-volley/dataVolleyBasicV1';
import type { CodeProfile } from '../../profiles/types';
import { ContinuousInputController } from './ContinuousInputController';

function controller(profile: CodeProfile = defaultCompactV1) {
  return new ContinuousInputController(profile);
}

describe('ContinuousInputController', () => {
  it('keeps a tactical core open for inline details and commits it with Enter', () => {
    const input = controller();

    expect(input.replace('01A#')).toMatchObject({
      committedCodes: [],
      buffer: '01A#',
      state: 'core_complete',
    });
    expect(input.idleCommit()).toMatchObject({ committedCodes: [], buffer: '01A#' });
    expect(input.manualCommit()).toEqual({
      committedCodes: ['01A#'],
      buffer: '',
      state: 'empty',
    });
  });

  it('frames a fast concatenated stream without losing order', () => {
    const input = controller();
    const update = input.replace('01A#12S+07R#');

    expect(update).toEqual({
      committedCodes: ['01A#', '12S+'],
      buffer: '07R#',
      state: 'core_complete',
    });
    expect(input.manualCommit().committedCodes).toEqual(['07R#']);
  });

  it('keeps an incomplete prefix and never creates a ghost event', () => {
    const input = controller();

    expect(input.replace('01A')).toMatchObject({ committedCodes: [], state: 'prefix' });
    expect(input.idleCommit()).toMatchObject({ committedCodes: [], buffer: '01A' });
  });

  it('allows backspace-style replacement to repair the buffer', () => {
    const input = controller();

    expect(input.replace('01X')).toMatchObject({ state: 'invalid', committedCodes: [] });
    expect(input.replace('01')).toMatchObject({ state: 'prefix', committedCodes: [] });
    expect(input.replace('01A#')).toMatchObject({ state: 'core_complete', committedCodes: [] });
    expect(input.manualCommit().committedCodes).toEqual(['01A#']);
  });

  it('does not commit invalid input or duplicate a slow idle commit', () => {
    const input = controller();

    expect(input.replace('01X?')).toMatchObject({ state: 'invalid', committedCodes: [] });
    expect(input.manualCommit().committedCodes).toEqual([]);
    input.clear();
    input.replace('01A#');
    expect(input.manualCommit().committedCodes).toEqual(['01A#']);
    expect(input.manualCommit().committedCodes).toEqual([]);
  });

  it('uses the CodeProfile grammar for multi-character tokens', () => {
    const profile: CodeProfile = {
      ...defaultCompactV1,
      id: 'skill_first',
      grammar: ['skill', 'player', 'evaluation'],
      skills: { AT: 'attack', S: 'serve' },
      evaluations: { '3': 'excellent' },
    };
    const input = controller(profile);

    expect(input.replace('AT083S123')).toEqual({
      committedCodes: ['AT083'],
      buffer: 'S123',
      state: 'core_complete',
    });
  });

  it('keeps compact tactical details attached to one Data Volley event', () => {
    const input = controller(dataVolleyBasicV1);

    expect(input.replace('*01S!T5')).toEqual({
      committedCodes: [],
      buffer: '*01S!T5',
      state: 'complete',
    });
    expect(input.decode('*01S!T5')).toEqual({
      coreCode: '*01S!',
      tacticalTokens: ['T5'],
    });
    expect(input.replace('*01S!T5*02R#')).toEqual({
      committedCodes: ['*01S!T5'],
      buffer: '*02R#',
      state: 'core_complete',
    });
  });

  it('frames home and away Data Volley events in one stream', () => {
    const input = controller(dataVolleyBasicV1);

    expect(input.replace('*01A#*02S+A09R#')).toEqual({
      committedCodes: ['*01A#', '*02S+'],
      buffer: 'A09R#',
      state: 'core_complete',
    });
    expect(input.manualCommit().committedCodes).toEqual(['A09R#']);
  });

  it('does not split a valid continuation that only resembles a next-event prefix', () => {
    const profile: CodeProfile = {
      ...defaultCompactV1,
      id: 'long_evaluation',
      evaluations: { '#': 'excellent', '#1': 'positive' },
    };
    const input = controller(profile);

    expect(input.replace('01A#1')).toEqual({
      committedCodes: [],
      buffer: '01A#1',
      state: 'core_complete',
    });
  });
});
