import { hasCollapsedAntecedent } from '../has_collapsed_antecedent';

import { collapseBlock } from '../collapse_expand_block';

import { getBlock, sampleStateLarge } from '../../testHelpers';
import pluckGoodies from '../pluck_goodies';

describe('hasCollapsedAntecedents: function to test if an item has a collapsed ancestor', () => {
  it('should return false when item does not have any collapsed ancestors', () => {
    const editorState = sampleStateLarge();
    const { blockMap } = pluckGoodies(editorState);

    expect(
      hasCollapsedAntecedent(blockMap, getBlock(editorState, 2).getKey())
    ).toBe(false);
    expect(
      hasCollapsedAntecedent(blockMap, getBlock(editorState, 10).getKey())
    ).toBe(false);
    expect(
      hasCollapsedAntecedent(blockMap, getBlock(editorState, 30).getKey())
    ).toBe(false);
    expect(
      hasCollapsedAntecedent(blockMap, getBlock(editorState, 49).getKey())
    ).toBe(false);
  });

  it('returns false if the block is not present in blockMap', () => {
    const editorState = sampleStateLarge();
    const { blockMap } = pluckGoodies(editorState);

    expect(hasCollapsedAntecedent(blockMap, 'abcd')).toBe(false);
  });

  it('should return true even if the direct parent is not collapsed', () => {
    let editorState = sampleStateLarge();

    let blockMap = pluckGoodies(editorState).blockMap;
    expect(
      hasCollapsedAntecedent(blockMap, getBlock(editorState, 10).getKey())
    ).toBe(false);
    // collapse block with text 'Things to try'
    editorState = collapseBlock(editorState, getBlock(editorState, 8).getKey());
    blockMap = pluckGoodies(editorState).blockMap;

    // block outside collapsed block will return false
    expect(
      hasCollapsedAntecedent(blockMap, getBlock(editorState, 7).getKey())
    ).toBe(false);
    expect(
      hasCollapsedAntecedent(blockMap, getBlock(editorState, 10).getKey())
    ).toBe(true);
  });
});
