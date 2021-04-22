import {
  EditorState,
  RichUtils,
  SelectionState,
  ContentState,
  BlockMap,
  ContentBlock,
} from 'draft-js';

import pluckGoodies from './pluck_goodies';

import {
  getBlocksWithItsDescendants,
  hasChildren,
  adjustHasChildren,
} from './tree_utils';
import { moveCurrentBlockUp, moveCurrentBlockDown } from './move';
import { collapseBlock, expandBlock } from './collapse_expand_block';
// import { makeCorrectionsToNodeAndItsDescendants } from './make_corrections_to_node_and_its_descendants';
import { ROOT_KEY, MAX_DEPTH } from '../constants';
import { onTab } from './tab';

export const CHANGE = 'CHANGE';
export const SET_ROOT_EDITOR_STATE = 'SET_ROOT_EDITOR_STATE';
export const SET_EDITOR_STATE = 'SET_EDITOR_STATE';
export const SET_STATE = 'SET_STATE';
export const INSERT_SOFT_NEWLINE = 'INSERT_SOFT_NEWLINE';
export const ZOOM = 'ZOOM';
export const COLLAPSE_ITEM = 'COLLAPSE_ITEM';
export const EXPAND_ITEM = 'EXPAND_ITEM';
export const EXPAND_ALL = 'EXPAND_ALL';
export const COLLAPSE_ALL = 'COLLAPSE_ALL';
export const MOVE_UP = 'MOVE_UP';
export const MOVE_DOWN = 'MOVE_DOWN';
export const TOGGLE_COMPLETION = 'TOGGLE_COMPLETION';
export const DELETE_CURRENT_ITEM = 'DELETE_CURRENT_ITEM ';
export const INDENT = 'INDENT';
export const DEDENT = 'DEDENT';
export const BOOKMARK = 'BOOKMARK';

export interface DeepnotesEditorState {
  // This is for future, when editorState will only have blocks which are under the zoomed in item node. The rootEditorState will always have all the blocks.
  rootEditorState: EditorState;
  editorState: EditorState;
  zoomedInItemId: string;
}

interface ChangeAction {
  type: typeof CHANGE;
  editorState: EditorState;
}

interface InsertSoftNewlineAction {
  type: typeof INSERT_SOFT_NEWLINE;
}

interface SetRootEditorStateAction {
  type: typeof SET_ROOT_EDITOR_STATE;
  editorState: EditorState;
}

interface SetEditorStateAction {
  type: typeof SET_EDITOR_STATE;
  editorState: EditorState;
}

interface SetStateAction {
  type: typeof SET_STATE;
  prop: string;
  val: any;
}

interface MoveUpAction {
  type: typeof MOVE_UP;
}

interface MoveDownAction {
  type: typeof MOVE_DOWN;
}

interface CollapseItemAction {
  type: typeof COLLAPSE_ITEM;
  blockKey: string;
}

interface ExpandItemAction {
  type: typeof EXPAND_ITEM;
  blockKey: string;
}

interface ExpandAllAction {
  type: typeof EXPAND_ALL;
}

interface CollapseAllAction {
  type: typeof COLLAPSE_ALL;
}

interface ZoomAction {
  type: typeof ZOOM;
  blockKey: string;
}
interface ToggleCompletionAction {
  type: typeof TOGGLE_COMPLETION;
}

interface DeleteCurrentItemAction {
  type: typeof DELETE_CURRENT_ITEM;
}

interface IndentItemAction {
  type: typeof INDENT;
}

interface DedentItemAction {
  type: typeof DEDENT;
}

interface BookmarkAction {
  type: typeof BOOKMARK;
}

export type EditorActions =
  | BookmarkAction
  | IndentItemAction
  | DedentItemAction
  | ExpandAllAction
  | CollapseAllAction
  | DeleteCurrentItemAction
  | ToggleCompletionAction
  | ZoomAction
  | SetStateAction
  | ChangeAction
  | InsertSoftNewlineAction
  | SetRootEditorStateAction
  | SetEditorStateAction
  | MoveUpAction
  | MoveDownAction
  | CollapseItemAction
  | ExpandItemAction;

function updateSelectionForZoom(
  editorState: EditorState,
  zoomedInItemId: string
) {
  const { selectionState, blockMap } = pluckGoodies(editorState);
  let newSelectionState = selectionState;

  const blockWithItsChildren = getBlocksWithItsDescendants(
    blockMap,
    zoomedInItemId
  );
  // if the zoomed in item has children, let's focus the first child
  if (blockWithItsChildren.count() > 1) {
    // check if one of the children has focus
    const childWithFocus = blockWithItsChildren.find(
      block => !!(block && block.getKey() === selectionState.getAnchorKey())
    );

    // if one of the children has focus, just maintain that focus
    // else, focus the first child
    if (!childWithFocus) {
      const firstChild = blockWithItsChildren.rest().first();
      newSelectionState = SelectionState.createEmpty(firstChild.getKey());
    }
  } else {
    // if the zoomed in item also has the focus, we should retain it's cursor
    // position. Else create new focus on the zoomedin item with cursor at
    // start of line.
    if (selectionState.getAnchorKey() !== zoomedInItemId) {
      newSelectionState = SelectionState.createEmpty(zoomedInItemId);
    }
  }

  return EditorState.forceSelection(editorState, newSelectionState);
}

// This function create a new editorState with blocks only in the sub tree rooted at the zoomedInItemId
// function withBlocksForZoomedInItem(
// editorState: EditorState,
// zoomedInItemId: string,
// ) {
// const { blockMap } = pluckGoodies(editorState);

// const blocks = makeCorrectionsToNodeAndItsDescendants(
// blockMap,
// blockMap.get(zoomedInItemId),
// );

// return EditorState.createWithContent(
// ContentState.createFromBlockArray(blocks),
// );
// }

function zoomReducer(state: DeepnotesEditorState, itemId: string) {
  const { editorState, zoomedInItemId } = state;
  const { blockMap } = pluckGoodies(editorState);

  // if there no zoomed in item, that means there's nothing to zoom out into
  // If the zoomed in fellow is same is item to zoom into, the zoom reducer
  // is probably called because the search text changed
  // can't be because now we removed searchText from query string
  if (zoomedInItemId === itemId) {
    console.log('We are at the root. Nothing to zoom out into.');
    return state;
  }

  let zoomedBlock;

  // if we are provided itemId to zoom out to
  if (itemId) {
    zoomedBlock = blockMap.get(itemId);
  }

  const newZoomedInItemId = zoomedBlock ? zoomedBlock.getKey() : ROOT_KEY;

  // if the zoom is done to the root level, there will be no particular block
  // to zoom into. And zoomedBlock would be empty in that case. And we
  // don't need to maintain a separate wholeEditorState
  return {
    ...state,
    // we forceupdate the editor state to itself so that the editor refreshes
    // If we don't do that, we set the new zoomedInItemId but the editor does
    // not render again with that information
    // TODO: Instead of forceupdate, we can update the selection on editorState
    // We anyways should do it on zoomins. Updating selection, even if it leads
    // to same selection state, would automatically get draftjs to rerender.
    editorState: updateSelectionForZoom(state.editorState, newZoomedInItemId),
    zoomedInItemId: newZoomedInItemId,
  };
}

function toggleCompleteReducer(state: DeepnotesEditorState) {
  const { blockMap, anchorBlock, contentState, selectionState } = pluckGoodies(
    state.editorState
  );

  // Don't do anything if the item is empty
  if (anchorBlock.getText().trim() === '') {
    return state;
  }

  const blocksWithItsDescendants = getBlocksWithItsDescendants(
    blockMap,
    anchorBlock.getKey()
  );

  const newBlockMap = blockMap.merge(
    blocksWithItsDescendants.map(b =>
      b
        ? b.setIn(
            ['data', 'completed'],
            !anchorBlock.getIn(['data', 'completed'])
          )
        : b
    ) as BlockMap
  );

  const newContentState = contentState.merge({
    blockMap: newBlockMap,
    selectionBefore: selectionState,
    selectionAfter: selectionState,
  }) as ContentState;

  return {
    ...state,
    editorState: EditorState.push(
      state.editorState,
      newContentState,
      'toggle-completion' as any
    ),
  };
}

function deleteItemWithChildren(state: DeepnotesEditorState) {
  const { editorState } = state;
  const { contentState, blockMap, focusKey, focusBlock } = pluckGoodies(
    editorState
  );

  if (!focusKey) {
    return state;
  }

  const blocksToDelete = getBlocksWithItsDescendants(blockMap, focusKey);
  const parentId = blockMap.get(focusKey).getIn(['data', 'parentId']);

  let newBlockMap = blockMap
    .toSeq()
    .filter((_: any, k?: string) => !!(k && !blocksToDelete.has(k)))
    .toOrderedMap();

  // don't allow deleting if there is only one item in the list
  if (
    !newBlockMap ||
    newBlockMap.count() === 0 ||
    // at root level, the block map will still have one item, the root item
    (newBlockMap.count() === 1 && newBlockMap.has(ROOT_KEY))
  ) {
    return state;
  }

  const pSibling = contentState.getBlockBefore(focusBlock.getKey());

  let newSelection;

  if (pSibling) {
    newSelection = new SelectionState({
      anchorKey: pSibling.getKey(),
      anchorOffset: pSibling.getText().length - 1,
      focusKey: pSibling.getKey(),
      focusOffset: pSibling.getText().length - 1,
    });
  } else {
    // what if it's the only item in the list?
    newSelection = SelectionState.createEmpty(
      newBlockMap
        .toSeq()
        .first()
        .getKey()
    );
  }

  // reset the hasChildren state of the parent block
  newBlockMap = adjustHasChildren(newBlockMap, parentId);

  return {
    ...state,
    editorState: EditorState.push(
      editorState,
      contentState.merge({
        blockMap: newBlockMap,
        selectionBefore: newSelection,
        selectionAfter: newSelection,
      }) as ContentState,
      'delete-item' as any
    ),
  };
}

function expandCollapseAll(state: DeepnotesEditorState, collapse: boolean) {
  const { editorState, zoomedInItemId } = state;
  const { blockMap, contentState } = pluckGoodies(editorState);

  let blocksWithItsDescendants = getBlocksWithItsDescendants(
    blockMap,
    zoomedInItemId
  );

  blocksWithItsDescendants = blocksWithItsDescendants.rest().map(b => {
    if (!b) {
      return b;
    } else {
      if (hasChildren(blockMap, b.getKey())) {
        return b.setIn(['data', 'collapsed'], collapse);
      } else {
        return b;
      }
    }
  }) as BlockMap;
  const newBlockMap = blockMap.merge(blocksWithItsDescendants);

  const newEditorState = EditorState.push(
    editorState,
    contentState.set('blockMap', newBlockMap) as ContentState,
    'collapse-all' as any
  );

  return {
    ...state,
    editorState: newEditorState,
  };
}

function toggleBookmark(editorState: EditorState, zoomedInItemId: string) {
  const { blockMap, contentState } = pluckGoodies(editorState);

  const zoomedInBlock = blockMap.get(zoomedInItemId);

  const newBlockMap = blockMap.set(
    zoomedInItemId,
    zoomedInBlock.setIn(
      ['data', 'bookmarked'],
      !zoomedInBlock.getIn(['data', 'bookmarked'])
    ) as ContentBlock
  ) as BlockMap;

  return EditorState.push(
    editorState,
    contentState.set('blockMap', newBlockMap) as ContentState,
    'bookmark' as any
  );
}

export function rootReducer(
  state: DeepnotesEditorState,
  action: EditorActions
) {
  switch (action.type) {
    case CHANGE:
      return {
        ...state,
        editorState: action.editorState,
      };
    case INSERT_SOFT_NEWLINE:
      return {
        ...state,
        editorState: RichUtils.insertSoftNewline(state.editorState),
      };
    case SET_ROOT_EDITOR_STATE:
      return {
        ...state,
        rootEditorState: action.editorState,
      };
    case SET_EDITOR_STATE:
      return {
        ...state,
        editorState: action.editorState,
      };
    case SET_STATE:
      return {
        ...state,
        [action.prop]: action.val,
      };
    case MOVE_UP:
      return {
        ...state,
        editorState: moveCurrentBlockUp(
          state.editorState,
          state.zoomedInItemId
        ),
      };
    case MOVE_DOWN:
      return {
        ...state,
        editorState: moveCurrentBlockDown(
          state.editorState,
          state.zoomedInItemId
        ),
      };
    case COLLAPSE_ITEM:
      return {
        ...state,
        editorState: collapseBlock(state.editorState, action.blockKey),
      };
    case EXPAND_ITEM:
      return {
        ...state,
        editorState: expandBlock(state.editorState, action.blockKey),
      };
    case EXPAND_ALL:
      return expandCollapseAll(state, false);
    case COLLAPSE_ALL:
      return expandCollapseAll(state, true);
    case TOGGLE_COMPLETION:
      return toggleCompleteReducer(state);
    case DELETE_CURRENT_ITEM:
      return deleteItemWithChildren(state);
    case ZOOM:
      // TODO: we should always pluck out the id of the thing to zoom to
      // and then send it to this reducer
      return zoomReducer(state, action.blockKey);
    case INDENT:
      return {
        ...state,
        editorState: onTab(state.editorState, MAX_DEPTH, state.zoomedInItemId),
      };
    case DEDENT:
      return {
        ...state,
        editorState: onTab(
          state.editorState,
          MAX_DEPTH,
          state.zoomedInItemId,
          true
        ),
      };
    case BOOKMARK:
      return {
        ...state,
        editorState: toggleBookmark(state.editorState, state.zoomedInItemId),
      };
    default:
      return state;
  }
}
