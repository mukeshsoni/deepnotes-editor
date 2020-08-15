import deepEqual from 'deep-equal';
import { updatedDiff } from 'deep-object-diff';
import { convertToRaw } from 'draft-js';

import {
  getBlock,
  assertParentId,
  assertBlockPos,
  assertBlockDepth,
  assertBlockText,
  moveFocus,
  sampleStateLarge,
} from '../../testHelpers.ts';

import { getEmptySlateState } from '../block_creators';
import { onTab } from '../tab.ts';
import { ROOT_KEY, BASE_POS } from '../../constants';
import DB, { arrToObj } from '../../object_db.ts';
import { loadFromDb } from '../../load_from_db';

const MAX_DEPTH = 10;

function indentBlock(editorState, blockIndex, zoomedInItemId) {
  editorState = moveFocus(editorState, blockIndex, 0);
  editorState = onTab(editorState, MAX_DEPTH, zoomedInItemId);
  return editorState;
}

function dedentBlock(editorState, blockIndex, zoomedInItemId) {
  editorState = moveFocus(editorState, blockIndex, 0);
  editorState = onTab(editorState, MAX_DEPTH, zoomedInItemId, true);
  return editorState;
}

class Tester {
  constructor() {
    this.editorState = getEmptySlateState(ROOT_KEY);
  }

  indentBlock = (blockIndex, zoomedInItemIndex) => {
    const zoomedInBlock = getBlock(this.editorState, zoomedInItemIndex);
    const zoomedInItemId = zoomedInBlock ? zoomedInBlock.getKey() : undefined;

    this.editorState = indentBlock(
      this.editorState,
      blockIndex,
      zoomedInItemId
    );
    return this;
  };

  dedentBlock = (blockIndex, zoomedInItemIndex) => {
    const zoomedInBlock = getBlock(this.editorState, zoomedInItemIndex);
    const zoomedInItemId = zoomedInBlock ? zoomedInBlock.getKey() : undefined;

    this.editorState = dedentBlock(
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

describe('onTab function', () => {
  describe('check depth after indent operation', () => {
    it('should change depth of item onTab', () => {
      const blockToIndentIndex = 3;
      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToIndentIndex, 2)
        .indentBlock(blockToIndentIndex)
        .assertBlockDepth(blockToIndentIndex, 3);
    });

    it('should do nothing if tab was pressed on a zoomedin item', () => {
      const blockToIndentIndex = 3;

      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToIndentIndex, 2)
        .indentBlock(blockToIndentIndex, blockToIndentIndex)
        .assertBlockDepth(blockToIndentIndex, 2);
    });

    it('should do nothing to depth if tab was pressed on the first child which also has children', () => {
      const blockToIndentIndex = 9;

      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToIndentIndex, 4)
        .indentBlock(blockToIndentIndex)
        .assertBlockDepth(blockToIndentIndex, 4);
    });

    it('should do nothing if tab is pressed on first child of a zoomed in item', () => {
      const blockToIndentIndex = 10;
      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToIndentIndex, 5)
        .indentBlock(blockToIndentIndex, blockToIndentIndex - 1)
        .assertBlockDepth(blockToIndentIndex, 5);
    });
  });

  describe('check depth after dedent operation', () => {
    it('should change depth of item shift+tab', () => {
      const blockToDedentIndex = 3;
      const dedentedBlockAfterDedentIndex = 49;

      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToDedentIndex, 2)
        .dedentBlock(blockToDedentIndex)
        .assertBlockDepth(dedentedBlockAfterDedentIndex, 1)
        .assertBlockText(
          dedentedBlockAfterDedentIndex,
          'Every bullet is a document.'
        );
    });

    it('should do nothing if shift+tab was pressed on a zoomedin item', () => {
      const blockToDedentIndex = 3;

      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToDedentIndex, 2)
        .dedentBlock(blockToDedentIndex, blockToDedentIndex)
        .assertBlockDepth(blockToDedentIndex, 2);
    });

    it('should decrease depth if tab was pressed on the first child which also has children', () => {
      const blockToDedentIndex = 9;
      const dedentedBlockAfterDedentIndex = 37;

      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToDedentIndex, 4)
        .dedentBlock(blockToDedentIndex)
        // .assertBlockDepth(dedentedBlockAfterDedentIndex, 3)
        .assertBlockText(dedentedBlockAfterDedentIndex, 'Things to try');
    });

    it('should do nothing if shift+tab is pressed on first child of a zoomed in item', () => {
      const blockToDedentIndex = 10;

      new Tester()
        .loadSampleStateLarge()
        .assertBlockDepth(blockToDedentIndex, 5)
        .dedentBlock(blockToDedentIndex, blockToDedentIndex)
        .assertBlockDepth(blockToDedentIndex, 5);
    });
  });

  describe('parentId and pos updates due to onTab', () => {
    it('should update parentId to previous sibling if previous sibling is at same level', () => {
      const blockToIndentIndex = 3;

      new Tester()
        .loadSampleStateLarge()
        .assertParentId(blockToIndentIndex, 1)
        .assertBlockPos(blockToIndentIndex, 2 * BASE_POS)
        .indentBlock(blockToIndentIndex)
        .assertParentId(blockToIndentIndex, 2)
        .assertBlockPos(blockToIndentIndex, BASE_POS);
    });

    it('should update parentId for a dedent operation', () => {
      const blockToDedentIndex = 3;
      const dedentedBlockAfterDedentIndex = 49;

      new Tester()
        .loadSampleStateLarge()
        .assertParentId(blockToDedentIndex, 1)
        .assertBlockPos(blockToDedentIndex, 2 * BASE_POS)
        .dedentBlock(blockToDedentIndex)
        .assertParentId(dedentedBlockAfterDedentIndex, 0)
        .assertBlockPos(dedentedBlockAfterDedentIndex, 2 * BASE_POS);
    });

    // item 22 in our data is one with the text
    // "Things real people have done with WorkFlowy"
    // When we indent that item, it becomes the child of "Things to try".
    // The position is not BASE_POS here
    it('should update parentId and pos correctly for item 22', () => {
      const blockToIndentIndex = 22;

      new Tester()
        .loadSampleStateLarge()
        .assertParentId(blockToIndentIndex, 8)
        .assertBlockPos(blockToIndentIndex, 2 * BASE_POS)
        .indentBlock(blockToIndentIndex)
        .assertParentId(blockToIndentIndex, 9)
        .assertBlockPos(blockToIndentIndex, 12 * BASE_POS);
    });

    it('property based test - should test a series of indent/dedent operation combination', () => {
      const editorState = sampleStateLarge();
      const contentState = editorState.getCurrentContent();
      const blockMap = contentState.getBlockMap();
      const totalOperations = 10;

      function randomIntFromInterval(min, max) {
        // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
      }

      // generate a list of 100-200 item indexes. We will send an operation of
      // indent or dedent to each of those indexes one after another.
      const indices = Array(totalOperations)
        .fill(0)
        .map(() => randomIntFromInterval(1, blockMap.count() - 1));

      const operations = ['indentBlock', 'dedentBlock'];
      // Also generate in advance the list of operations we will perform
      const operationsList = indices.map(blockIndex => [
        blockIndex,
        operations[randomIntFromInterval(0, 1)],
      ]);
      let numOperations = totalOperations;
      let lastFailingOperationNum = totalOperations;
      let lastSuccessNumOperations = 0;

      while (true && numOperations > 0) {
        console.log({
          totalOperations,
          numOperations,
          lastFailingOperationNum,
          lastSuccessNumOperations,
        });
        const finalEditorState = operationsList
          .slice(0, numOperations)
          .reduce((acc, [blockIndex, selectedOperation]) => {
            // console.log(selectedOperation, blockIndex, i);
            if (selectedOperation === 'indentBlock') {
              return indentBlock(acc, blockIndex);
            } else {
              return dedentBlock(acc, blockIndex);
            }
          }, editorState);

        // we will store our final state blocks in an object database
        // And then try to load it back to our app as blocks array using our
        // loadFromDb function
        // It should match the blocks which we can get from finalContentState
        const finalContentState = finalEditorState.getCurrentContent();
        const finalBlocksArray = convertToRaw(finalContentState).blocks;
        const db = new DB(arrToObj(finalBlocksArray, 'key'));
        const blocksFromDb = loadFromDb(db, ROOT_KEY);

        // if things look good, let's try to increasing numOperations and see
        // if that fails. Only if numOperations < totalOperations
        if (deepEqual(blocksFromDb, finalBlocksArray)) {
          if (numOperations === totalOperations) {
            console.log('everything looks good');
            break;
          } else {
            lastSuccessNumOperations = numOperations;

            numOperations = Math.ceil(
              (lastSuccessNumOperations + lastFailingOperationNum) / 2
            );
          }
        } else {
          lastFailingOperationNum = numOperations;

          if (lastSuccessNumOperations + 1 === lastFailingOperationNum) {
            console.log(
              'Found a minimal case for failing',
              operationsList.slice(0, numOperations),
              updatedDiff(finalBlocksArray, blocksFromDb)
            );

            // fs.writeFileSync(
            // 'from_db_1.json',
            // JSON.stringify(finalBlocksArray, null, 2),
            // 'utf8',
            // );
            // fs.writeFileSync(
            // 'from_db_2.json',
            // JSON.stringify(blocksFromDb, null, 2),
            // 'utf8',
            // );
            break;
          }

          numOperations = Math.ceil(
            (lastSuccessNumOperations + lastFailingOperationNum) / 2
          );
        }
      }
    });
  });
});
