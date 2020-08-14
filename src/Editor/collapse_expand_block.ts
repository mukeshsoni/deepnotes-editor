import {
  ContentState,
  ContentBlock,
  EditorState,
  SelectionState,
} from 'draft-js';

import pluckGoodies from './pluck_goodies';
import { getBlocksWithItsDescendants } from './tree_utils';

function toggleCollapseState(
  editorState: EditorState,
  collapseState: boolean,
  blockKey: string
) {
  const { contentState, selectionState, blockMap } = pluckGoodies(editorState);
  const block = blockMap.get(blockKey);

  // if the block does not exists
  // or if the collapsed state is already in the desired state, let it be
  if (!block || block.getIn(['data', 'collapsed']) === collapseState) {
    return editorState;
  }

  const blockWithItsChildren = getBlocksWithItsDescendants(blockMap, blockKey);
  // if this list contains just one item, it's that block itself. There are
  // no children to collapse
  if (!blockWithItsChildren || blockWithItsChildren.count() === 1) {
    return editorState;
  }

  const newContentState = contentState.merge({
    blockMap: blockMap.set(
      blockKey,
      block.setIn(['data', 'collapsed'], collapseState) as ContentBlock
    ),
  }) as ContentState;

  const newSelection = new SelectionState({
    anchorKey: blockKey,
    anchorOffset: selectionState.getAnchorOffset(),
    // There is a bug where when i click expand/collapse arrow of any item, the
    // draft-js code throws an exception. It seems to happen consistently when
    // i click the first item arrow with mouse. Happens randomly for other
    // items on and off.
    // And looks like it doesn't happen again if i set the focusKey to
    // undefined. Definitely not an ideal bug fix.
    // TODO: figure out why this might happen. What is the focusKey exactly
    // doing?
    focusKey: undefined,
    focusOffset: selectionState.getFocusOffset(),
  });
  const newState = EditorState.push(
    editorState,
    newContentState,
    collapseState ? 'collapse-list' : ('expand-list' as any)
  );

  return EditorState.forceSelection(newState, newSelection);
}

export function collapseBlock(
  editorState: EditorState,
  blockKey: string
): EditorState {
  const { anchorKey } = pluckGoodies(editorState);

  return toggleCollapseState(editorState, true, blockKey || anchorKey);
}

export function expandBlock(
  editorState: EditorState,
  blockKey: string
): EditorState {
  const { anchorKey } = pluckGoodies(editorState);

  return toggleCollapseState(editorState, false, blockKey || anchorKey);
}

/*
 * bug - if the cursor is at end of line of the list item, expand does
 * not work. If the cursor is anywhere else on the line, it works
 * Root cause - selectionState.getAnchorKey, getStartKey, getFocusKey - all
 * return the wrong information when the cursor is at the end of line. They
 * return the last child of the collapsed item as the anchor block
 * Once we collapse the item, the selection state goes wrong. It sets itself
 * to the last child of the collapsed item. Probably because draftjs also
 * handles command+up or command+down? don't know.
 *
 * bug - Once expanded, creating new item with 'Enter' key creates the
 * new item as a child of the current item. Because the selectionState is
 * pointing to the last child of this item. Just hiding the block with
 * display: none is not a viable solution. Also because we are not controlling
 * the wrapper li for each list item. That's controlled by draft-js. We
 * are just hiding the content inside that li. We might need to completely
 * remove those blocks from contentState when collapsing items. And maintain
 * a master contentState somewhere. But that would create problems of
 * syncing that master contentState with changed contentState while editing
 * a current one which has one or more collapsed items. Hmm...
 */
