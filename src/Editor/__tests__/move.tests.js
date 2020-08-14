import { ROOT_KEY, BASE_POS } from '../../constants';
import { getEmptySlateState } from '../block_creators';
import { moveCurrentBlockUp, moveCurrentBlockDown } from '../move.ts';

import {
  getBlock,
  assertParentId,
  assertBlockPos,
  assertBlockDepth,
  assertBlockText,
  moveFocus,
  sampleStateLarge,
} from '../../testHelpers.ts';

function moveBlockUp(editorState, blockIndex, zoomedInItemId) {
  editorState = moveFocus(editorState, blockIndex, 0);
  editorState = moveCurrentBlockUp(editorState, zoomedInItemId);
  return editorState;
}

function moveBlockDown(editorState, blockIndex, zoomedInItemId) {
  editorState = moveFocus(editorState, blockIndex, 0);
  editorState = moveCurrentBlockDown(editorState, zoomedInItemId);
  return editorState;
}

class Tester {
  constructor() {
    this.editorState = getEmptySlateState(ROOT_KEY);
  }

  moveBlockUp = (blockIndex, zoomedInItemIndex) => {
    const zoomedInBlock = getBlock(this.editorState, zoomedInItemIndex);
    const zoomedInItemId = zoomedInBlock ? zoomedInBlock.getKey() : undefined;

    this.editorState = moveBlockUp(
      this.editorState,
      blockIndex,
      zoomedInItemId
    );
    return this;
  };

  moveBlockDown = (blockIndex, zoomedInItemIndex) => {
    const zoomedInBlock = getBlock(this.editorState, zoomedInItemIndex);
    const zoomedInItemId = zoomedInBlock ? zoomedInBlock.getKey() : undefined;

    this.editorState = moveBlockDown(
      this.editorState,
      blockIndex,
      zoomedInItemId
    );
    return this;
  };

  loadSampleStateLarge = () => {
    this.editorState = sampleStateLarge();
    return this;
  };

  assertParentId = (blockIndex, parentIndex) => {
    const parent = getBlock(this.editorState, parentIndex);
    const parentId = parent.getKey();

    assertParentId(this.editorState, blockIndex, parentId);
    return this;
  };

  assertBlockPos = (blockIndex, pos) => {
    assertBlockPos(this.editorState, blockIndex, pos);
    return this;
  };

  assertBlockDepth = (blockToIndentIndex, expectedDepth) => {
    assertBlockDepth(this.editorState, blockToIndentIndex, expectedDepth);
    return this;
  };

  assertBlockText = (blockNumber, expectedText) => {
    assertBlockText(this.editorState, blockNumber, expectedText);
    return this;
  };
}

describe('move related functions', () => {
  it('should move block up', () => {
    const blockToMoveIndex = 4;
    const blockText = 'Every document can contain infinite documents.';

    new Tester()
      .loadSampleStateLarge()
      .assertBlockText(blockToMoveIndex, blockText)
      .moveBlockUp(blockToMoveIndex)
      .assertBlockText(blockToMoveIndex, 'Every bullet is a document.')
      .assertBlockText(blockToMoveIndex - 1, blockText);
  });

  it('should move block down', () => {
    const blockToMoveIndex = 3;

    new Tester()
      .loadSampleStateLarge()
      .assertBlockText(blockToMoveIndex, 'Every bullet is a document.')
      .assertParentId(blockToMoveIndex, 1)
      .moveBlockDown(blockToMoveIndex)
      .assertBlockText(
        blockToMoveIndex,
        'Every document can contain infinite documents.'
      )
      .assertBlockText(blockToMoveIndex + 1, 'Every bullet is a document.')
      .assertParentId(blockToMoveIndex + 1, 1);
  });

  it('should move item up to a different parents, if possible', () => {
    const blockToMoveIndex = 6;
    const blockIndexAfterMove = 5;
    const blockText =
      'It lets you easily organize hundreds of thousands of notes, ideas and projects.';

    new Tester()
      .loadSampleStateLarge()
      .assertBlockText(blockToMoveIndex, blockText)
      .assertParentId(blockToMoveIndex, 5)
      .moveBlockUp(blockToMoveIndex)
      .assertBlockText(blockIndexAfterMove, blockText)
      .assertParentId(blockIndexAfterMove, 4)
      .assertBlockPos(blockIndexAfterMove, BASE_POS);
  });

  it('should move item down to a different parent as first child, if possible', () => {
    const blockToMoveIndex = 18;
    const blockIndexAfterMove = 19;
    const blockText =
      '#important You can share any bullet with different people, no matter where it is. This is the most flexible sharing model in any tool. #fractal';

    new Tester()
      .loadSampleStateLarge()
      .assertBlockText(blockToMoveIndex, blockText)
      .assertParentId(blockToMoveIndex, 17)
      .moveBlockDown(blockToMoveIndex)
      // it should move to new parent as the first child
      .assertBlockText(blockIndexAfterMove, blockText);
    // .assertParentId(blockIndexAfterMove, 18);
  });

  it('should not move block away from current parent if the parent is zoomed in', () => {
    const blockToMoveIndex = 6;
    const zoomedInItemIndex = 5;
    const blockIndexAfterMove = 6;
    const blockText =
      'It lets you easily organize hundreds of thousands of notes, ideas and projects.';

    new Tester()
      .loadSampleStateLarge()
      .assertBlockText(blockToMoveIndex, blockText)
      .assertParentId(blockToMoveIndex, 5)
      .moveBlockUp(blockToMoveIndex, zoomedInItemIndex)
      .assertBlockText(blockIndexAfterMove, blockText)
      .assertParentId(blockIndexAfterMove, 5);
  });
});
