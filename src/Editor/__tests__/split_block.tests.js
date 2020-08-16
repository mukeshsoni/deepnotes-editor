import { EditorState } from 'draft-js';
import {
  assertBlockDepth,
  assertParentId,
  assertBlockCount,
  assertBlockPos,
  assertBlockText,
  getParentId,
  getBlock,
  sampleStateLarge,
  moveFocus,
  updateText,
  addNewBlock,
} from '../../testHelpers.ts';

import { BASE_POS, ROOT_KEY } from '../../constants';
import { getEmptySlateState } from '../block_creators';
import { splitBlock } from '../split_block';
import { getPosNumber } from '../../testHelpers';

function getEditorWithSomeStuff() {
  let editorState = getEmptySlateState(ROOT_KEY);

  editorState = updateText(editorState, 1, 'hey there');
  editorState = addNewBlock(editorState, 'how you doing?');
  editorState = EditorState.moveFocusToEnd(editorState);

  return editorState;
}

describe('splitBlock function', () => {
  describe('block count, position, text and depth after split', () => {
    // write tests about the assignment of parentId and position data
    // attributes on the new block
    it('should create new empty block when split at end of a block', () => {
      let editorState = getEditorWithSomeStuff();

      assertBlockCount(editorState, 3);
      editorState = splitBlock(editorState, ROOT_KEY);
      assertBlockCount(editorState, 4);
      assertBlockText(editorState, 2, 'how you doing?');
      assertBlockText(editorState, 3, '');
    });

    it('should split text and put it in the new block when focus is in not at the end of line', () => {
      let editorState = getEditorWithSomeStuff();

      assertBlockCount(editorState, 3);
      editorState = moveFocus(editorState, 2, 3);

      editorState = splitBlock(editorState, ROOT_KEY);
      // printBlocks(editorState);
      assertBlockCount(editorState, 4);
      assertBlockText(editorState, 2, 'how');
      assertBlockText(editorState, 3, ' you doing?');
    });

    it('should create new block at same depth as block being split', () => {
      let editorState = getEditorWithSomeStuff();

      editorState = splitBlock(editorState, ROOT_KEY);
      assertBlockDepth(editorState, 3, 1);
    });
  });

  describe('parentId and position data', () => {
    it('should give same parentId to new block as the split block', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);

      editorState = moveFocus(editorState, 2, 3);
      editorState = splitBlock(editorState, ROOT_KEY);
      assertBlockCount(editorState, 51);
      assertParentId(editorState, 3, getParentId(editorState, 2));

      editorState = moveFocus(editorState, 7, 3);
      editorState = splitBlock(editorState, ROOT_KEY);
      assertBlockCount(editorState, 52);
      assertParentId(editorState, 8, getParentId(editorState, 7));
    });

    it('should set block to split as parentId if that block is zoomed in', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);

      const blockToSplitIndex = 5;
      const blockToSplit = getBlock(editorState, blockToSplitIndex);
      editorState = moveFocus(editorState, blockToSplitIndex, 3);
      editorState = splitBlock(editorState, blockToSplit.getKey());
      assertBlockCount(editorState, 51);
      assertParentId(editorState, blockToSplitIndex + 1, blockToSplit.getKey());
    });
    // TODO: It might be better to load some existing editorState, like we do
    // for cypress, move selection around, and then splitBlock and test
    // resulting editorState. It might also not be a bad idea to have different
    // such jsons as fixtures and load and test whichever we want to instead of
    // trying to manipulate our editorState by writing these helper functions
    // which themselves might have bugs.
    it('should set position as that between 0 and first child next when splitting a normal non-collapsed parent block', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);

      const blockToSplitIndex = 5;
      editorState = moveFocus(editorState, blockToSplitIndex, 3);
      editorState = splitBlock(editorState);
      assertBlockCount(editorState, 51);
      // verify the position of the new block
      assertBlockPos(editorState, blockToSplitIndex + 1, BASE_POS / 2);
    });

    it('should set position as next possible position when splitting a child block', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);

      const blockToSplitIndex = 21;
      const blockToSplit = getBlock(editorState, blockToSplitIndex);
      editorState = moveFocus(editorState, blockToSplitIndex, 3);
      editorState = splitBlock(editorState);
      assertBlockCount(editorState, 51);
      // verify the position of the new block
      assertBlockPos(
        editorState,
        blockToSplitIndex + 1,
        blockToSplit.get('data').get('pos') + BASE_POS
      );
    });

    it('should set position as next possible intermediate position when splitting a intermediate child block', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);

      const blockToSplitIndex = 4;
      const blockToSplit = getBlock(editorState, blockToSplitIndex);
      editorState = moveFocus(editorState, blockToSplitIndex, 3);
      editorState = splitBlock(editorState);
      assertBlockCount(editorState, 51);
      // verify the position of the new block
      assertBlockPos(
        editorState,
        blockToSplitIndex + 1,
        // because  there's a block after the split block at the same level
        // the new block will get a pos in between the split block and the next block
        blockToSplit.get('data').get('pos') + BASE_POS / 2
      );
    });

    it('should set position as the position for first position when splitting a zoomed in item', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);

      const blockToSplitIndex = 5;
      const blockToSplit = getBlock(editorState, blockToSplitIndex);
      editorState = moveFocus(editorState, blockToSplitIndex, 3);
      editorState = splitBlock(editorState, blockToSplit.getKey());
      assertBlockCount(editorState, 51);
      // because the zoomed in item has other children, it should generate a pos value in between 0 and the first item pos
      assertBlockPos(editorState, blockToSplitIndex + 1, BASE_POS / 2);
    });

    it('should set position as an in between position when splitting an intermediate item in a list of items at same level', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);

      // it's the 4th line with text
      // "Every document can contain infinite documents."
      const blockToSplitIndex = 4;
      const blockToSplit = getBlock(editorState, blockToSplitIndex);
      editorState = moveFocus(
        editorState,
        blockToSplitIndex,
        blockToSplit.getText().length
      );
      editorState = splitBlock(editorState);
      assertBlockCount(editorState, 51);
      const newBlock = getBlock(editorState, blockToSplitIndex + 1);
      const nextBlock = getBlock(editorState, blockToSplitIndex + 2);
      expect(newBlock.get('data').get('pos')).toBeGreaterThan(
        blockToSplit.get('data').get('pos')
      );
      expect(newBlock.get('data').get('pos')).toBeLessThan(
        nextBlock.get('data').get('pos')
      );
    });

    it('should split and create a block above current block if cursor is at beginning of line, for a leaf item', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);
      const blockToSplitIndex = 3;
      const blockToSplit = getBlock(editorState, blockToSplitIndex);
      assertBlockDepth(editorState, blockToSplitIndex, 2);
      editorState = moveFocus(editorState, blockToSplitIndex, 0);
      editorState = splitBlock(editorState);
      assertBlockCount(editorState, 51);
      assertBlockText(editorState, blockToSplitIndex, '');
      assertBlockText(
        editorState,
        blockToSplitIndex + 1,
        blockToSplit.getText()
      );
      assertBlockDepth(editorState, blockToSplitIndex, 2);
      assertBlockDepth(editorState, blockToSplitIndex + 1, 2);
      expect(getPosNumber(editorState, blockToSplitIndex)).toBeLessThan(
        getPosNumber(editorState, blockToSplitIndex + 1)
      );
      expect(getPosNumber(editorState, blockToSplitIndex + 1)).toBeLessThan(
        getPosNumber(editorState, blockToSplitIndex + 2)
      );
    });

    it('should split and create a block above current block if cursor is at beginning of line, for an expanded item. It should not create a child item in this case.', () => {
      let editorState = sampleStateLarge();
      assertBlockCount(editorState, 50);
      const blockToSplitIndex = 5;
      const blockToSplit = getBlock(editorState, blockToSplitIndex);
      assertBlockDepth(editorState, blockToSplitIndex, 2);
      editorState = moveFocus(editorState, blockToSplitIndex, 0);
      editorState = splitBlock(editorState);
      assertBlockCount(editorState, 51);
      assertBlockText(editorState, blockToSplitIndex, '');
      assertBlockText(
        editorState,
        blockToSplitIndex + 1,
        blockToSplit.getText()
      );
      assertBlockDepth(editorState, blockToSplitIndex, 2);
      assertBlockDepth(editorState, blockToSplitIndex + 1, 2);
      expect(getPosNumber(editorState, blockToSplitIndex)).toBeLessThan(
        getPosNumber(editorState, blockToSplitIndex + 1)
      );
      expect(getPosNumber(editorState, blockToSplitIndex)).toBeGreaterThan(
        getPosNumber(editorState, blockToSplitIndex - 1)
      );
      expect(getParentId(editorState, blockToSplitIndex + 2)).toBe(
        blockToSplit.getKey()
      );
      expect(getParentId(editorState, blockToSplitIndex)).toBe(
        blockToSplit.getIn(['data', 'parentId'])
      );
    });
  });
});
