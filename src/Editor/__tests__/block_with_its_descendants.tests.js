import { getBlocksWithItsDescendants } from '../tree_utils';
import { sampleStateLarge, getBlock } from '../../testHelpers';
import pluckGoodies from '../pluck_goodies';

describe("block with it's children", () => {
  it("should get the block along with it's children", () => {
    const editorState = sampleStateLarge();
    const { blockMap } = pluckGoodies(editorState);

    let blockWithItsChildren = getBlocksWithItsDescendants(
      blockMap,
      getBlock(editorState, 9).getKey()
    );

    expect(blockWithItsChildren.count()).toBe(13);
    expect(blockWithItsChildren.toArray()[0].getText()).toBe('Things to try');
    expect(blockWithItsChildren.toArray()[12].getText()).toBe(
      'Learn the keyboard shortcuts (they make everything super fast)'
    );

    // select the first block which should select all blocks since everything
    // else is inside this block
    blockWithItsChildren = getBlocksWithItsDescendants(
      blockMap,
      getBlock(editorState, 1).getKey()
    );

    expect(blockWithItsChildren.count()).toBe(49);
  });

  it('should return nothing if the block does not exist', () => {
    const editorState = sampleStateLarge();
    const { blockMap } = pluckGoodies(editorState);

    const blockWithItsChildren = getBlocksWithItsDescendants(blockMap, 'abcd');

    expect(blockWithItsChildren.count()).toBe(0);
  });
});
