import { OrderedMap } from 'immutable';
import {
  EditorState,
  ContentState,
  SelectionState,
  ContentBlock,
  BlockMap,
} from 'draft-js';

import pluckGoodies from './pluck_goodies';
import { getNewContentBlock } from './block_creators';
import { getBlocksWithItsDescendants } from './tree_utils';
import { getPosNum, getPosAfter } from './pos_generators';

// TODO: Should instead use recreateParentBlockMap
function insertBlocksAtKey(
  blockMap: BlockMap,
  blocksToInsert: Immutable.Iterable<string, ContentBlock>,
  insertionBlockKey: string,
  insertBefore: boolean
) {
  const insertionBlock = blockMap.get(insertionBlockKey);
  const blocksBeforeInsertionPoint = blockMap
    .toSeq()
    .takeUntil((_, k) => k === insertionBlockKey);
  const blocksAfterInsertionPoint = blockMap
    .toSeq()
    .skipUntil((_, k) => k === insertionBlockKey)
    .rest();

  if (insertBefore) {
    return blocksBeforeInsertionPoint
      .concat(blocksToInsert)
      .concat([[insertionBlockKey, insertionBlock]])
      .concat(blocksAfterInsertionPoint)
      .toOrderedMap();
  } else {
    return blocksBeforeInsertionPoint
      .concat([[insertionBlockKey, insertionBlock]])
      .concat(blocksToInsert)
      .concat(blocksAfterInsertionPoint)
      .toOrderedMap();
  }
}

function insertBlocksAfter(
  blockMap: BlockMap,
  blocks: Immutable.Iterable<string, ContentBlock>,
  insertionBlockKey: string
) {
  return insertBlocksAtKey(blockMap, blocks, insertionBlockKey, false);
}

/**
 * Will add a child to the given parentBlockKey after all of it's children.
 * If the parentBlockKey has no children, it will create a new child and add
 * that.
 */
function appendChild(
  blockMap: BlockMap,
  parentBlockKey: string,
  blockToAdd: ContentBlock
) {
  const blockWithItsChildren = getBlocksWithItsDescendants(
    blockMap,
    parentBlockKey
  );

  let blockToInsertAfterKey = parentBlockKey;
  const parentId = parentBlockKey;
  let pos = getPosNum(1);
  // if the block has some children
  if (blockWithItsChildren && blockWithItsChildren.count() > 1) {
    blockToInsertAfterKey = blockWithItsChildren.last().getKey();
    pos = getPosAfter(blockWithItsChildren.last().getIn(['data', 'pos']));
  }

  return insertBlocksAfter(
    blockMap,
    OrderedMap({
      [blockToAdd.getKey()]: blockToAdd
        .setIn(['data', 'parentId'], parentId)
        .setIn(['data', 'pos'], pos) as ContentBlock,
    }),
    blockToInsertAfterKey
  );
}

/**
 * Adds an empty block to the end of the list
 * If we are in a zoomed in state, we should add the block to the end of the
 * children list for the zoomedin item
 */
export function addEmptyBlockToEnd(
  editorState: EditorState,
  zoomedInItemId: string,
  depth: number
) {
  const { contentState, blockMap } = pluckGoodies(editorState);
  const newBlock = getNewContentBlock({ depth });
  let newBlockMap;

  // if we are at the root level, we can simply add the block to end of list
  if (!zoomedInItemId) {
    newBlockMap = blockMap.set(newBlock.getKey(), newBlock);
  } else {
    // otherwise we need to add the block to end of children list of the zoomed
    // in item. There can be 2 cases here
    // 1. The zoomed in item already has children
    // 2. The zoomed in item does not have any children
    // In this case, we can add the block after the zoomedin item and then call
    // onTab, which will make that block the zoomed in items child
    // OR - let's just write a appendChild method which takes care of both cases
    // internally
    newBlockMap = appendChild(blockMap, zoomedInItemId, newBlock);
  }

  const newSelection = SelectionState.createEmpty(newBlock.getKey());

  const newContentState = contentState.merge({
    blockMap: newBlockMap,
    selectionBefore: newSelection,
    selectionAfter: newSelection.merge({
      anchorKey: newBlock.getKey(),
      anchorOffset: 0,
      focusKey: newBlock.getKey(),
      focusOffset: 0,
    }),
  }) as ContentState;

  // Always, always use this method to modify editorState when in doubt about
  // how to edit the editor state. It maintains the undo/redo stack for the
  // stack - https://draftjs.org/docs/api-reference-editor-state#push
  return EditorState.forceSelection(
    EditorState.push(editorState, newContentState, 'add-new-item' as any),
    newSelection
  );
}
