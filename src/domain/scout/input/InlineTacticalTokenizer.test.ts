import { describe, expect, it } from 'vitest';
import { dataVolleyBasicV1 } from '../../../profiles/code/data-volley/dataVolleyBasicV1';
import { tokenizeInlineTactical } from './InlineTacticalTokenizer';

describe('InlineTacticalTokenizer', () => {
  it('separates compact tactical tokens without spaces', () => {
    expect(tokenizeInlineTactical('YHT5', dataVolleyBasicV1)).toEqual({
      state: 'complete',
      tokens: ['YH', 'T5'],
    });
  });

  it('keeps a prefix open while its value is still being typed', () => {
    expect(tokenizeInlineTactical('T', dataVolleyBasicV1)).toEqual({
      state: 'prefix',
      tokens: [],
    });
  });
});
