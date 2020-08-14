import {
  EditorState,
  ContentState,
  ContentBlock,
  SelectionState,
} from 'draft-js';

import pluckGoodies from './pluck_goodies';
import { getPosNum, getPosAfter, getPosInBetween } from './pos_generators';
import { recreateParentBlockMap } from './recreate_parent_block_map';
import { calculateDepth } from './calculate_depth';
import {
  getChildren,
  getFirstChild,
  getNextSibling,
  getPreviousSibling,
} from './tree_utils';
import { getBlocksWithItsDescendants } from './tree_utils';

function moveBlock(
  contentState: ContentState,
  blockToSwapWith: ContentBlock,
  blockToMoveKey: string,
  newParentId: string,
  newPos: number
) {
  const blockMap = contentState.getBlockMap();
  let anchorBlock = blockMap.get(blockToMoveKey);
  const parentId = anchorBlock.getIn(['data', 'parentId']);
  anchorBlock = anchorBlock
    .setIn(['data', 'parentId'], newParentId)
    .setIn(['data', 'pos'], newPos) as ContentBlock;

  let newBlockMap = blockMap
    .set(blockToMoveKey, anchorBlock)
    .set(blockToSwapWith.getKey(), blockToSwapWith);

  // the order of operation for redoing the recreateParentBlockMap for
  // parentId and newParentId is very important.
  // because OrderedMap is also a map at the end of the day,
  // so .concat works weirdly if we try to concatenate something which is
  // already present in the map
  // If we are moving something to new parent, wouldn't a single call to
  // recreateParentBlockMap solve all our problems? i.e. wouldn't it
  // automatically remove the block from it's previous position? No. Because the
  // block will be with it's old parent in the map and when trying to
  // concatenate a small part of the tree in a different node, the OrderedMap
  // would probably keep only one version of the altered block. Probably the
  // one which comes earlier. I don't know.
  // If we are doing a move, updating the current parent tree should essentially
  // delete the block from the whole blockMap
  newBlockMap = recreateParentBlockMap(
    contentState.set('blockMap', newBlockMap) as ContentState,
    newBlockMap,
    parentId
  );
  // all we have to do is again reattach the anchorBlock to newBlockMap before
  // recreating the newParentId tree
  if (newParentId !== parentId) {
    newBlockMap = newBlockMap.merge(
      getBlocksWithItsDescendants(blockMap, blockToMoveKey)
    );
    newBlockMap = newBlockMap.set(blockToMoveKey, anchorBlock);
    newBlockMap = recreateParentBlockMap(
      contentState.set('blockMap', newBlockMap) as ContentState,
      newBlockMap,
      newParentId
    );
  }

  return newBlockMap;
}

function getBlockToInsertBefore(editorState: EditorState) {
  const { blockMap, anchorKey } = pluckGoodies(editorState);
  const block = blockMap.get(anchorKey);

  const previousSibling = getPreviousSibling(blockMap, anchorKey);

  // two cases
  // 1. Either move the item before it's previous sibling
  // 2. If there is no previous sibling, move it as the last child of the previous sibling of it's parent

  if (previousSibling) {
    return previousSibling;
  }

  const parent = blockMap.get(block.getIn(['data', 'parentId']));
  const parentsPreviousSibling = getPreviousSibling(blockMap, parent.getKey());

  if (!parentsPreviousSibling) {
    return null;
  }

  const children = getChildren(blockMap, parentsPreviousSibling.getKey());

  if (children.count() > 0) {
    return children.last();
  } else {
    return parentsPreviousSibling;
  }
}

// which block should we insert the current block after when moving down?
// Can't just take the next one and say insert after that. Don't want to do
// that if it's the child of the block to be moved
function getBlockToInsertAfter(editorState: EditorState) {
  const { blockMap, anchorKey } = pluckGoodies(editorState);
  const block = blockMap.get(anchorKey);

  const nextSibling = getNextSibling(blockMap, anchorKey);

  // two cases
  // 1. Either move the item after it's next sibling
  // 2. If there is no next sibling, it's the last child. Move it as the first child of the next sibling of the parent
  if (nextSibling) {
    return nextSibling;
  }

  const parent = blockMap.get(block.getIn(['data', 'parentId']));
  const parentNextSibling = getNextSibling(blockMap, parent.getKey());

  if (!parentNextSibling) {
    return null;
  }

  return parentNextSibling;
}

export function moveCurrentBlockUp(
  editorState: EditorState,
  zoomedInItemId?: string
) {
  const { contentState, blockMap, selectionState, anchorKey } = pluckGoodies(
    editorState
  );

  let blockToSwapWith = getBlockToInsertBefore(editorState);

  if (!blockToSwapWith) {
    console.log('moveCurrentBlockUp', 'nothing to swap with');
    return editorState;
  }

  // we are trying to move a block above the currently zoomed in item, do
  // nothing
  if (
    zoomedInItemId &&
    (blockToSwapWith.getKey() === zoomedInItemId ||
      (contentState.getBlockAfter(blockToSwapWith.getKey()) &&
        contentState.getBlockAfter(blockToSwapWith.getKey()).getKey() ===
          zoomedInItemId))
  ) {
    return editorState;
  }
  /*
   * This will not work when we move multiple blocks or move blocks across
   * depths. E.g. if i move a child item in depth 1 up, it should not replace
   * it's parent but move beyond that and as a child of the earlier higher level
   * item. Such things are much better done with a 'delete and insert' operation
   *
   * 1. Determine the key of block to be remove - anchorKey
   * 2. Determine the index where it needs to be inserted
   * 3. Delete the block from map using key
   * 4. Convert blockMap to seq and insert the deleted block at (index - 1).
   * Maybe using concat like we are doing below or some better way.
   * If nothing else, let's fallback to our trusted `reduce` :)
   *
   * Will need a separate algorithm when we need to move multiple blocks
   * because the block to be moved is collapsed.
   *
   */

  const anchorBlock = blockMap.get(anchorKey);

  // Instead of doing so many shenanigans, all we need to determine
  // is the blocks new parentId and pos. There might be 2 cases with parentId
  // 1. It remains the same
  // 2. It changes
  // In case 1. we call recreateParentBlockMap after changing the pos for
  // affected blocks (swapped ones)
  // In case 2. we change parentId of moved block and it's pos and then
  // call recreateParentBlockMap for both the new and the old parentIds
  const parentId = anchorBlock.getIn(['data', 'parentId']);
  let newParentId;
  let newPos;

  if (blockToSwapWith.getIn(['data', 'parentId']) === parentId) {
    newParentId = parentId;
    newPos = blockToSwapWith.getIn(['data', 'pos']);
    blockToSwapWith = blockToSwapWith.setIn(
      ['data', 'pos'],
      anchorBlock.getIn(['data', 'pos'])
    ) as ContentBlock;
  } else {
    // we are moving below the child the preceding parent block
    if (
      calculateDepth(blockMap, blockToSwapWith.getKey()) ===
      calculateDepth(blockMap, anchorBlock.getKey())
    ) {
      newParentId = blockToSwapWith.getIn(['data', 'parentId']);
      newPos = getPosAfter(blockToSwapWith.getIn(['data', 'pos']));
    } else {
      // we are probably moving inside an item without any children
      newParentId = blockToSwapWith.getKey();
      newPos = getPosNum(1);
    }
  }

  const newBlockMap = moveBlock(
    contentState,
    blockToSwapWith,
    anchorKey,
    newParentId,
    newPos
  );

  const newContentState = contentState.merge({
    blockMap: newBlockMap,
  }) as ContentState;

  const newSelection = new SelectionState({
    anchorKey: anchorKey,
    anchorOffset: selectionState.getAnchorOffset(),
    focusKey: anchorKey,
    focusOffset: selectionState.getFocusOffset(),
  });

  // Always, always use this method to modify editorState when in doubt about
  // how to edit the editor state. It maintains the undo/redo stack for the
  // stack - https://draftjs.org/docs/api-reference-editor-state#push
  const newState = EditorState.push(
    editorState,
    newContentState,
    'move-block' as any
  );

  return EditorState.forceSelection(newState, newSelection);
}

export function moveCurrentBlockDown(
  editorState: EditorState,
  zoomedInItemId?: string
) {
  const { contentState, selectionState, blockMap, anchorKey } = pluckGoodies(
    editorState
  );

  // TODO: write function to find the block to swap with when dealing with
  // nested items
  let blockToSwapWith = getBlockToInsertAfter(editorState);

  if (!blockToSwapWith || blockToSwapWith.getKey() === anchorKey) {
    console.log('moveCurrentBlockDown', 'nothing to swap with');
    return editorState;
  }

  const anchorBlock = blockMap.get(anchorKey);

  // Instead of doing so many shenanigans, all we need to determine
  // is the blocks new parentId and pos. There might be 2 cases with parentId
  // 1. It remains the same
  // 2. It changes
  // In case 1. we call recreateParentBlockMap after changing the pos for
  // affected blocks (swapped ones)
  // In case 2. we change parentId of moved block and it's pos and then
  // call recreateParentBlockMap for both the new and the old parentIds
  const parentId = anchorBlock.getIn(['data', 'parentId']);
  let newParentId;
  let newPos;

  // We found a sibling to swap positions with
  if (blockToSwapWith.getIn(['data', 'parentId']) === parentId) {
    newParentId = parentId;
    newPos = blockToSwapWith.getIn(['data', 'pos']);
    blockToSwapWith = blockToSwapWith.setIn(
      ['data', 'pos'],
      anchorBlock.getIn(['data', 'pos'])
    ) as ContentBlock;
  } else {
    // we might be trying to push the item to the zoomed in items next sibling
    // which will make the block disappear from the zoomed in editor state
    // let's not allow that
    if (zoomedInItemId === anchorBlock.getIn(['data', 'parentId'])) {
      return editorState;
    }

    // the blockToSwapWith has to be it's parent, if eligible
    newParentId = blockToSwapWith.getKey();
    const firstChild = getFirstChild(blockMap, blockToSwapWith.getKey());
    // const newParentsChildren = getChildren(blockMap, blockToSwapWith.getKey());

    // we are moving above the first child of the next parent block
    // case 1 - If there are already some parents present
    if (firstChild) {
      newPos = getPosInBetween(0, firstChild.getIn(['data', 'pos']));
    } else {
      // case 2 - There are not existing children. This item will be the first child.
      newPos = getPosNum(1);
    }
  }

  const newBlockMap = moveBlock(
    contentState,
    blockToSwapWith,
    anchorKey,
    newParentId,
    newPos
  );

  const newContentState = contentState.merge({
    blockMap: newBlockMap,
  }) as ContentState;
  const newSelection = new SelectionState({
    anchorKey: anchorKey,
    anchorOffset: selectionState.getAnchorOffset(),
    focusKey: anchorKey,
    focusOffset: selectionState.getFocusOffset(),
  });

  // Always, always use this method to modify editorState when in doubt about
  // how to edit the editor state. It maintains the undo/redo stack for the
  // stack - https://draftjs.org/docs/api-reference-editor-state#push
  const newState = EditorState.push(
    editorState,
    newContentState,
    'move-block' as any
  );

  return EditorState.forceSelection(newState, newSelection);
}
