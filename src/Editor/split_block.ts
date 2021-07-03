import { EditorState, ContentState, ContentBlock } from 'draft-js';

import { getPosNum, getPosInBetween, getPosAfter } from './pos_generators';
import pluckGoodies from './pluck_goodies';
import { getChildren, hasChildren, getNextSibling } from './tree_utils';
import { getNewContentBlock } from './block_creators';
import { recreateParentBlockMap } from './recreate_parent_block_map';

// TODO: add parentKey to the newly created blocks
// TODO: add order to the newly created blocks
// TODO: Write unit tests for this function
// TODO: Adjust the hasChildren attribute of both the newly created block as well as their
// parent blocks, in case the newly created block becomes a child of some block
export function splitBlock(editorState: EditorState, zoomedInItemId: string) {
  const { contentState, selectionState, blockMap } = pluckGoodies(editorState);

  // only allow split block when nothing is selected
  if (!selectionState.isCollapsed()) {
    return editorState;
  }

  const key = selectionState.getAnchorKey();
  let blockToSplit = blockMap.get(key);
  const text = blockToSplit.getText();
  const isBlockCollapsed = blockToSplit.getIn(['data', 'collapsed']);
  const isBlockToSplitZoomedIn = zoomedInItemId === blockToSplit.getKey();

  let offset = selectionState.getAnchorOffset();
  // if we calculate offset, pos and parentId, we are good to go.
  // we can set the new text on the split block and create a
  // new block with parentId and pos and recreateParentBlock
  let pos, parentId;
  const chars = blockToSplit.getCharacterList();

  // if user presses enter when cursor is at the start of line of a zoomed in
  // item, we want to create a new empty child item instead of pushing the whole
  // line of zoomed in item to the child
  if (isBlockToSplitZoomedIn && offset === 0) {
    offset = blockToSplit.getText().length;
  }

  // if the block to split is the zoomed in item, we need to add the new item
  // as a child, i.e. depth greater than the block being split
  // We also want to do that for all kinds of parent items when they are not collapsed
  // Every zoomed in item is a parent and we might want to remove that condition altogether
  // but that will not work since a zoomed in item might be collapsed
  if (
    isBlockToSplitZoomedIn ||
    (!isBlockCollapsed &&
      hasChildren(blockMap, blockToSplit.getKey()) &&
      // we don't want to create a new child if the split is with cursor at the beginning
      // of the line. Then just create a new block above the current block
      selectionState.getStartOffset() !== 0)
  ) {
    // the child can either be the first child EVER of the item

    // or one of the chlidren. In the second case, we need to calculate the pos carefully
    const zoomedInBlockChildren = getChildren(blockMap, blockToSplit.getKey());
    if (zoomedInBlockChildren.count() > 0) {
      pos = getPosInBetween(
        0,
        zoomedInBlockChildren.first().getIn(['data', 'pos'])
      );
    } else {
      pos = getPosNum(1);
    }
    parentId = blockToSplit.getKey();
  } else {
    const nextSibling = getNextSibling(blockMap, blockToSplit.getKey());

    if (nextSibling) {
      pos = getPosInBetween(
        blockToSplit.get('data').get('pos'),
        nextSibling.get('data').get('pos')
      );
    } else {
      pos = getPosAfter(blockToSplit.getIn(['data', 'pos']));
    }

    parentId = blockToSplit.getIn(['data', 'parentId']);
    // if we are inserting a block above current block by keeping cursor at beginning of line and pressing enter
    if (selectionState.getStartOffset() === 0) {
      const tempPos = blockToSplit.getIn(['data', 'pos']);
      blockToSplit = blockToSplit.setIn(['data', 'pos'], pos) as ContentBlock;
      pos = tempPos;

      offset = blockToSplit.getText().length;
    }
  }

  let newBlockMap = blockMap.set(
    blockToSplit.getKey(),
    blockToSplit
      .set('text', text.slice(0, offset))
      .set('characterList', chars.slice(0, offset)) as ContentBlock
  ) as ContentBlock;
  const newBlock = getNewContentBlock({
    text: text.slice(offset),
  })
    .set('depth', blockMap.get(parentId).getDepth() + 1)
    .setIn(['data', 'parentId'], parentId)
    .setIn(['data', 'pos'], pos) as ContentBlock;
  newBlockMap = newBlockMap.set(newBlock.getKey(), newBlock) as ContentBlock;
  newBlockMap = recreateParentBlockMap(
    contentState.merge({
      blockMap: newBlockMap,
    }) as ContentState,
    newBlockMap,
    parentId
  ) as ContentBlock;

  const newContentState = contentState.merge({
    blockMap: newBlockMap,
    selectionBefore: selectionState,
    selectionAfter: selectionState.merge({
      anchorKey: newBlock.getKey(),
      anchorOffset: 0,
      focusKey: newBlock.getKey(),
      focusOffset: 0,
      isBackward: false,
    }),
  }) as ContentState;

  // Always, always use this method to modify editorState when in doubt about
  // how to edit the editor state. It maintains the undo/redo stack for the
  // stack - https://draftjs.org/docs/api-reference-editor-state#push
  return EditorState.push(editorState, newContentState, 'split-block');
}
