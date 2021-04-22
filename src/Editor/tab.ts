import {
  SelectionState,
  ContentState,
  EditorState,
  BlockMap,
  ContentBlock,
} from 'draft-js';

import { ROOT_KEY } from '../constants';

import { getPosNum, getPosAfter, getPosInBetween } from './pos_generators';
import { recreateParentBlockMap } from './recreate_parent_block_map';
import { calculateDepth } from './calculate_depth';
import { adjustHasChildren } from './tree_utils';

function getParentIdAfterAdjustment(
  contentState: ContentState,
  indentBlockKey: string,
  newDepth: number
): string {
  let previousBlock = contentState.getBlockBefore(indentBlockKey);
  const blockMap = contentState.getBlockMap();

  // TODO: Add description about what we are doing in this while loop
  while (previousBlock) {
    if (calculateDepth(blockMap, previousBlock.getKey()) < newDepth) {
      return previousBlock.getKey();
    }

    previousBlock = contentState.getBlockBefore(previousBlock.getKey());
  }

  return ROOT_KEY;
}

/**
 * Once we find the parentId after indent or dedent, we don't need the exact
 * operation which was performed. We can use the parentId to get all the current
 * nodes with same parentId, the adjusted blocks position in those children
 * and hence the adjusted blocks new postion
 */
function getPosAfterAdjustment(
  blockMap: BlockMap,
  adjustedBlockKey: string,
  newParentId: string
): number {
  // we get the blockMap with adjusted parentId. This will help us get the
  // position of the adjusted block in the children list
  const blocksWithSameParent = blockMap
    .filter(b => !!(b && b.get('data').get('parentId') === newParentId))
    .toArray();

  let i = 0;
  let blockBefore;
  let blockAfter;

  while (i < blocksWithSameParent.length) {
    // once we find the adjustment block, we know the surrounding 2 are
    // actually it's blockBefore and blockAfter at the same depth
    if (blocksWithSameParent[i].getKey() === adjustedBlockKey) {
      blockBefore = blocksWithSameParent[i - 1];
      blockAfter = blocksWithSameParent[i + 1];
      break;
    }

    i += 1;
  }

  if (blockBefore && blockAfter) {
    return getPosInBetween(
      blockBefore.get('data').get('pos'),
      blockAfter.get('data').get('pos')
    );
  } else if (blockBefore) {
    return getPosAfter(blockBefore.get('data').get('pos'));
  } else if (blockAfter) {
    return getPosNum(1);
  } else {
    return getPosNum(1);
  }
}

// adjust block depth by +1 or -1 for the current item as well as all it's
// children and the children of children recursively. We don't need to do it
// recursively in this case because draftjs blockMap is ordered and we know
// that we have handled all the descendents of the current item when we reach
// another item which is at same depth as current item
function adjustBlockDepthForContentState(
  contentState: ContentState,
  selectionState: SelectionState,
  adjustment: number
): ContentState {
  // TODO: can we not use getBlocksWithItsChildren here? Probably not since we
  // need any grandchildren and their children and theirs
  const indentBlockKey = selectionState.getAnchorKey();

  let blockMap = contentState.getBlockMap();
  let indentBlock = blockMap.get(indentBlockKey);
  const newDepth = calculateDepth(blockMap, indentBlockKey) + adjustment;
  const oldParentId = indentBlock.getIn(['data', 'parentId']);

  // TODO: When we dedent an item which is in between it's other siblings,
  // we need to create the list of items from this dedented item's parent and
  // downwards again and completely replace that list in the current blockMap.
  // It will lead to things like an a middle sibling being dedented changing it's
  // position in the list after the end of it's siblings but one level up.
  // Check workflowy behavior.
  // The only way to do it seems to be rearranging everything inside the parent
  // of this dedented item.
  // we can use arrToObj and loadFromDb functions to rearrange the affected
  // blocks. Using getStartAndEndKeys we can get the blocks array from our
  // blockMap and then use arrToObj to create an object map of the blocks and
  // pass it to loadFromDb to get a block array again.
  // To update the blocks inside BlockMap, which is an OrderedMap, we have to
  // use the same trick that we use in splitBlock. Create a aboveBlocks,
  // betweenBlocks and afterBlocks arrays and merge them to make the final
  // blockMap again.
  // something like
  // blockMap.slice(0, indentBlockKey)
  //    .concat(Immutable.OrderedMap(
  //       // from [{ key: 'a' }, { key: 'b' } ] to
  //       // [ ['a', { key: 'a' }], ['b', { key: 'b' }]]
  //       // so that Immutable.OrderedMap can consume it correctly
  //       convertToKeyValuePairs(
  //         loadFromDb(new DB(blockMap.slice(indentBlockKey, endKey).toJS()))
  //       )
  //     )
  //    .concat(blockMap.slice(endKey))
  // Let's call that function recreateParentBlockMap()
  const parentId = getParentIdAfterAdjustment(
    contentState,
    indentBlockKey,
    newDepth
  );

  indentBlock = indentBlock.setIn(
    ['data', 'parentId'],
    parentId
  ) as ContentBlock;
  // we need to update blockMap before we send it to getPosAfterAdjustment
  blockMap = blockMap.set(indentBlock.getKey(), indentBlock);
  indentBlock = indentBlock.setIn(
    ['data', 'pos'],
    getPosAfterAdjustment(blockMap, indentBlock.getKey(), parentId)
  ) as ContentBlock;

  // set new parent id
  blockMap = blockMap.set(indentBlockKey, indentBlock);
  blockMap = recreateParentBlockMap(
    contentState.set('blockMap', blockMap) as ContentState,
    blockMap,
    parentId
  ) as BlockMap;

  // if the parent block is collapsed, expand it
  // otherwise we won't be able to see where the indented block went
  if (adjustment === 1) {
    const parentBlock = blockMap.get(parentId);
    if (parentBlock.getIn(['data', 'collapsed'])) {
      blockMap = blockMap.set(
        parentId,
        parentBlock.setIn(['data', 'collapsed'], false) as ContentBlock
      ) as BlockMap;
    }
  }

  // We want to adjust the hasChildren property of both the old parent block as well
  // as the new parent block for the indented/dedented block
  blockMap = adjustHasChildren(
    adjustHasChildren(blockMap, oldParentId),
    parentId
  );

  return contentState.merge({
    blockMap,
    selectionBefore: selectionState,
    selectionAfter: selectionState,
  }) as ContentState;
}

/*
 * Overriding the draft-js provided onTab function since it doesn't work on
 * multiple list items, i.e. an hierarchy of items. If i press tab on an item
 * which has children, it should move into the previous sibling along with all
 * it's children.
 * TODO: update parentKeys as appropriate
 */
export function onTab(
  editorState: EditorState,
  maxDepth: number,
  zoomedInItemId?: string,
  shiftKey = false
) {
  const selection = editorState.getSelection();
  // TODO: Why are we using startBlockKey here? Why not anchorKey
  const startBlockKey = selection.getStartKey();
  const content = editorState.getCurrentContent();
  const blockMap = content.getBlockMap();
  const startBlock = content.getBlockForKey(startBlockKey);
  const previousBlock = content.getBlockBefore(startBlockKey);
  const baseDepth = zoomedInItemId
    ? calculateDepth(blockMap, zoomedInItemId) + 1
    : 0;

  if (
    // if the first block in selection is the first block overall, don't do
    // anything. Either for tab or for shift-tab
    !previousBlock ||
    // if we are trying to change depth of the zoomed in item itself
    calculateDepth(blockMap, startBlock.getKey()) < baseDepth ||
    // if we are trying to dedent the direct children of the zoomed in item
    (shiftKey && calculateDepth(blockMap, startBlock.getKey()) === baseDepth)
  ) {
    console.log('This seems like the first list item. Nothing to do.');
    return editorState;
  }

  const depth = calculateDepth(blockMap, startBlock.getKey());

  if (depth >= maxDepth) {
    return editorState;
  }

  // we don't want a difference of more than one level between an item and
  // it's previous block
  if (
    !shiftKey &&
    calculateDepth(blockMap, startBlock.getKey()) -
      calculateDepth(blockMap, previousBlock.getKey()) >=
      1
  ) {
    return editorState;
  }

  const withAdjustment = adjustBlockDepthForContentState(
    content,
    selection,
    shiftKey ? -1 : 1
  );

  // Always, always use this method to modify editorState when in doubt about
  // how to edit the editor state. It maintains the undo/redo stack for the
  // stack - https://draftjs.org/docs/api-reference-editor-state#push
  return EditorState.push(editorState, withAdjustment, 'adjust-depth');
}
