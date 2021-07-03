import * as React from 'react';
import classNames from 'classnames';
import {
  DraftHandleValue,
  ContentBlock,
  Editor,
  EditorState,
  DraftEditorCommand,
  RichUtils,
  Modifier,
  KeyBindingUtil,
  getDefaultKeyBinding,
} from 'draft-js';

import { EditorContext } from './EditorDispatchContext';

import debounce from '../../debounce';
import Menu from './Menu';
// import { logToScreen } from './screen_logger';
import { createDecorators } from '../decorators';
import pluckGoodies from '../pluck_goodies';
import { getEmptySlateState } from '../block_creators';
import { addEmptyBlockToEnd } from '../add_empty_block_to_end';
import { getBlocksWithItsDescendants } from '../tree_utils';
import { splitBlock } from '../split_block';
import { findParent } from '../find_parent';
import { Item } from './Item';
import { pasteText } from '../paste_text';
import { ROOT_KEY, SEARCH_DEBOUNCE } from '../../constants';
import {
  DeepnotesEditorState,
  EditorActions,
  rootReducer,
  EXPAND_ALL,
  COLLAPSE_ALL,
} from '../state_manager';
import {
  SET_ROOT_EDITOR_STATE,
  SET_EDITOR_STATE,
  INSERT_SOFT_NEWLINE,
  ZOOM,
  COLLAPSE_ITEM,
  EXPAND_ITEM,
  MOVE_UP,
  MOVE_DOWN,
  TOGGLE_COMPLETION,
  DELETE_CURRENT_ITEM,
  CHANGE,
  INDENT,
  DEDENT,
  BOOKMARK,
} from '../state_manager';
import useDocumentTitle from '../../hooks/document-title';
import usePrevious from '../../hooks/previous';

import { hasCollapsedAntecedent } from '../has_collapsed_antecedent';
import { sanitizePosAndDepthInfo } from '../sanitize_pos_and_depth_info';

import PlusSign from '../../icons/PlusSign';

import 'draft-js/dist/Draft.css';
import './editor_styles.global.css';
import buttonStyles from '../../button_styles.module.css';
import styles from './editor_styles.module.css';

declare global {
  interface Window {
    state: DeepnotesEditorState;
    scratch: any;
  }
}

function notADescendantOfZoomedInItem(
  editorState: EditorState,
  block: ContentBlock,
  zoomedInItemId: string
) {
  const { blockMap } = pluckGoodies(editorState);

  const blockWithItsDescendants = getBlocksWithItsDescendants(
    blockMap,
    zoomedInItemId
  );

  return !blockWithItsDescendants.find(
    (b?: ContentBlock) => !!(b && b.getKey() === block.getKey())
  );
}

// This is the key to a faster blockShouldBeHidden function
// TODO: Right now we are busting this cache on every render. We should find a way
// to only bust it if required. That is, only bust it if there's an operation which might
// spoil the data related to visibility.
let shouldBeHiddenCache: { [key: string]: boolean } = {};
function blockShouldBeHidden(
  editorState: EditorState,
  block: ContentBlock,
  zoomedInItemId: string,
  searchText?: string
) {
  const { blockMap } = pluckGoodies(editorState);
  const parentId = block.getIn(['data', 'parentId']);

  if (shouldBeHiddenCache[parentId] !== undefined) {
    // we set the hidden property of a zoomed in items parent also as hidden
    // But we want to show the zoomed in item itself
    return shouldBeHiddenCache[parentId] && block.getKey() !== zoomedInItemId;
  }

  const shouldBeHidden =
    block.getKey() === ROOT_KEY ||
    // When zoomed in, anything below the zoomed in item level can be hidden
    block.getDepth() < blockMap.get(zoomedInItemId).getDepth() ||
    (block.getKey() !== zoomedInItemId &&
      // we don't want to hide items inside collapsed parents if there is a
      // search text
      !searchText &&
      hasCollapsedAntecedent(blockMap, block.getKey(), zoomedInItemId)) ||
    (searchText &&
      !block
        .getText()
        .toLowerCase()
        .includes(searchText.toLowerCase())) ||
    notADescendantOfZoomedInItem(editorState, block, zoomedInItemId);

  if (block.getKey() !== ROOT_KEY) {
    shouldBeHiddenCache[parentId] = shouldBeHidden;
    if (shouldBeHidden) {
      shouldBeHiddenCache[block.getKey()] = shouldBeHidden;
    }
  }

  return shouldBeHidden;
}

const initialState = {
  loading: true,
  zoomedInItemId: ROOT_KEY,
  rootEditorState: getEmptySlateState(ROOT_KEY),
  editorState: getEmptySlateState(ROOT_KEY),
};

interface Props {
  initialEditorState?: EditorState;
  initialZoomedInItemId: string;
  searchText?: string;
  onChange?: (editorState: EditorState) => void;
  onRootChange?: (zoomedInItemId: string) => void;
  editorWrapperStyle?: React.CSSProperties;
  onBookmarkClick?: () => void;
  withToolbar?: boolean;
}

// TODO: let's try to also retain the selection state here
// Don't know if editor.getCurrentContent() has the selection state too. Should
// have
function forceUpdateEditorState(editorState: EditorState, searchText = '') {
  // TODO - the below code ensures that our redo/undo stack is also maintained.
  // But do we care about it when we zoom into an item?
  const newEditorStateInstance = EditorState.createWithContent(
    editorState.getCurrentContent(),
    createDecorators(searchText)
  );

  return EditorState.set(newEditorStateInstance, {
    selection: editorState.getSelection(),
    undoStack: editorState.getUndoStack(),
    redoStack: editorState.getRedoStack(),
    lastChangeType: editorState.getLastChangeType(),
  });
}

// Default maximum block depth supported by Draft.js CSS.
export const DRAFT_DEFAULT_MAX_DEPTH = 4;

// Default depth class prefix from Draft.js CSS.
export const CUSTOM_DEPTH_CLASS = 'public-DraftStyleDefault-depth-deepnotes-';

export const generateListNestingStyles = (
  selectorPrefix: string,
  maxDepth: number
) => {
  let styles = `
.public-DraftStyleDefault-unorderedListItem:empty {
  display: none
}
`;

  for (let depth = 0; depth <= maxDepth; depth++) {
    const prefix = `${selectorPrefix}${depth}`;

    styles += `
.${prefix}.public-DraftStyleDefault-listLTR { 
list-style: none;
padding: 0;
margin: 0;
}
`;
  }

  return styles;
};

/**
 * Dynamically generates the right list nesting styles.
 * Can be wrapped as a pure component - to re-render only when `max` changes (eg. never).
 */
export const ListNestingStyles = React.memo((props: { max: number }) => {
  const { max } = props;

  return max > DRAFT_DEFAULT_MAX_DEPTH ? (
    <style>{generateListNestingStyles(`${CUSTOM_DEPTH_CLASS}`, max)}</style>
  ) : null;
});

ListNestingStyles.displayName = 'ListNestingStyles';

/**
 * Add depth classes that Draft.js doesn't provide.
 * See https://github.com/facebook/draft-js/blob/232791a4e92d94a52c869f853f9869367bdabdac/src/component/contents/DraftEditorContents-core.react.js#L58-L62.
 * @param {ContentBlock} block
 */
export const blockDepthStyleFn = (block: ContentBlock) => {
  const type = block.getType();

  if (type === 'unordered-list-item') {
    const depth = block.getDepth();
    const baseItemStyles = 'list-none m-0';
    return `${baseItemStyles} ${CUSTOM_DEPTH_CLASS}${String(depth)}`;
  }

  return '';
};

// for caching the object containing dispatch related functions
// otherwise the components accessing values from context rerender
// on every render
let editorDispatchContextValue = {};

function DeepnotesEditor(props: Props) {
  // const [showBoardView, setShowBoardView] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const editor = React.useRef<any>(null);
  // using useReducer instead of multiple useState calls because this
  // is the top component and will probably have the global state with it.
  // useReducer will allow us to have logic to modify various parts of global
  // state in one place
  const [state, dispatch] = React.useReducer<
    React.Reducer<DeepnotesEditorState, EditorActions>
  >(
    rootReducer,
    // The second argument to useReducer can also be thought as the default
    // value of the state. From reducer perspective, it means the initial
    // value.
    initialState
  );

  const {
    searchText,
    initialEditorState,
    initialZoomedInItemId = ROOT_KEY,
    onChange,
    onRootChange,
    editorWrapperStyle,
    onBookmarkClick,
    withToolbar = true,
  } = props;
  const { editorState, zoomedInItemId } = state;

  window.state = state;

  useDocumentTitle(editorState, zoomedInItemId);

  function setRootEditorState(editorState: EditorState) {
    dispatch({ type: SET_ROOT_EDITOR_STATE, editorState });
  }

  const setEditorState = React.useCallback(
    (editorState: EditorState) => {
      dispatch({ type: SET_EDITOR_STATE, editorState });
    },
    [dispatch]
  );

  const expandParticularBlock = React.useCallback(
    (blockKey: string) => {
      dispatch({ type: EXPAND_ITEM, blockKey });
    },
    [dispatch]
  );

  const collapseParticularBlock = React.useCallback(
    (blockKey: string) => {
      dispatch({ type: COLLAPSE_ITEM, blockKey });
    },
    [dispatch]
  );

  const zoomTo = React.useCallback(
    (blockKey: string) => {
      dispatch({ type: ZOOM, blockKey });

      if (typeof onRootChange === 'function') {
        onRootChange(blockKey);
      }
    },
    [dispatch, onRootChange]
  );

  // load initial editorState from the owner props
  // React.useEffect(() => {
  // if (initialEditorState) {
  // const sanitizedInitialEditorState = sanitizePosAndDepthInfo(
  // initialEditorState,
  // ROOT_KEY
  // );
  // setRootEditorState(sanitizedInitialEditorState);
  // setEditorState(sanitizedInitialEditorState);
  // }
  // }, [initialEditorState, setEditorState]);

  // load initial editorState from the owner props
  React.useEffect(() => {
    if (zoomedInItemId !== initialZoomedInItemId) {
      zoomTo(initialZoomedInItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomTo, initialZoomedInItemId]);

  const updateEditorState = React.useCallback(
    debounce((es: EditorState, searchText: string) => {
      setEditorState(forceUpdateEditorState(es, searchText));
    }, SEARCH_DEBOUNCE),
    [setEditorState]
  );

  const previousSearchText = usePrevious(searchText);
  React.useEffect(() => {
    if (previousSearchText !== undefined && searchText !== previousSearchText) {
      updateEditorState(editorState, searchText);
    }

    // i don't want to run it if previousSearchText changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  React.useEffect(() => {
    if (typeof onChange === 'function') {
      onChange(editorState);
    }
    // Nope. Just nope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorState]);

  // better to store in state rather than calculating in every render
  const baseDepth = editorState
    .getCurrentContent()
    .getBlockMap()
    .get(zoomedInItemId)
    .getDepth();

  shouldBeHiddenCache = {};

  function blockRendererFn(contentBlock: ContentBlock) {
    const type = contentBlock.getType();

    if (type === 'unordered-list-item') {
      return {
        component: Item,
        editable: true,
        // TODO: It would be better if we can remove the blockProps altogether
        props: {
          // TODO: Until we keep sending editorState to each Item, we can never memoize Item. editorState changes on every render.
          // If we can pass attach `hidden` information on each block when we create them, we won't have to send this at all
          zoomedInItemId: zoomedInItemId,
          baseDepth,
          searchText,
          hidden: blockShouldBeHidden(
            editorState,
            contentBlock,
            zoomedInItemId,
            searchText
          ),
          onExpandClick: expandParticularBlock,
          onCollapseClick: collapseParticularBlock,
        },
      };
    }

    return undefined;
  }

  function focusEditor() {
    // We don't want to refocus if it's already in focus
    if (
      editor &&
      editor.current &&
      editor.current.editor !== document.activeElement
    ) {
      // when we are at root level, calling editor.current.focus() does not
      // work. Because the selection on editorState is set to the first block
      // by default
      // because we have 2 blocks when we initialize the editor. One root
      // block and another empty child block for the root. We do so in order
      // to have a consistent representation of a tree at all zoom levels.
      // But it breaks draft-js focus. So we have to manually focus the item
      // by using DOM selection and rane magic.
      // TODO: We can also try forcing selection to the 2nd block and setting the editorState in our state
      // Update: Which is what we did. Had to do it in multiple places
      // probably better to put a check in one place which says that if
      // the selection is on the root block, move it to the first block
      editor.current.focus();
    } else {
      console.log('Editor already in focus');
    }
  }

  React.useEffect(() => {
    setTimeout(() => {
      focusEditor();
    }, 100);

    window.addEventListener('keydown', e => {
      if (e && e.which === 27) {
        // esc key
        if (searchInputRef && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }

      if (
        e.metaKey &&
        e.which === 191 &&
        editor.current &&
        editor.current.editor !== document.activeElement
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    if (initialEditorState) {
      const sanitizedInitialEditorState = sanitizePosAndDepthInfo(
        initialEditorState,
        ROOT_KEY
      );
      setRootEditorState(sanitizedInitialEditorState);
      setEditorState(sanitizedInitialEditorState);
    }

    // cleanup
    return () => {
      // TODO
    };
    // eslint-disable-next-line
  }, []);

  type SyntheticKeyboardEvent = React.KeyboardEvent<{}> | any;

  // step 2. How do we have nested lists? When the user hits the tab key, we
  // want the current list item to become a sub item to the outer one
  // We can do that by using the onTab prop of the Editor
  // And then creating new state using RichUtils.onTab helper function
  // That function takes the current state, and increases the depth of the
  // 'unordered-list-item' by 1
  const handleTab = React.useCallback(
    (event: SyntheticKeyboardEvent) => {
      event.preventDefault();
      if (event.shiftKey) {
        dispatch({ type: DEDENT });
      } else {
        dispatch({ type: INDENT });
      }
    },
    [dispatch]
  );

  const handleReturn = React.useCallback(
    (event: SyntheticKeyboardEvent): DraftHandleValue => {
      // alt+enter for marking item as complete. Works across platforms.
      if (event.altKey) {
        dispatch({ type: INSERT_SOFT_NEWLINE });
        return 'handled';
      }

      return 'not-handled';
    },
    [dispatch]
  );

  function keyBindingFn(e: any): any {
    if (
      KeyBindingUtil.hasCommandModifier(e) ||
      KeyBindingUtil.isCtrlKeyCommand(e)
    ) {
      switch (e.keyCode) {
        case 191: // command+/
          // we are handling this shortcut in Editor even though we don't control showing/hiding of keyboard shortcut panel in the editor
          // draft-js has a default action of select-all for this shortcut
          return 'toggle-keyboard-shortcut-panel';
        case 38: // up arrow. Let's collapse the list
          // cmd+shift+up moves the list item up
          if (e.shiftKey) {
            return 'move-up';
          } else {
            return 'collapse-list';
          }
        case 40: // down arrow
          // cmd+shift+down moves the list item down
          if (e.shiftKey) {
            return 'move-down';
          } else {
            return 'expand-list';
          }
        case 190: // for Command+.
          return 'zoom-in';
        case 188: // for Command+,
          return 'zoom-out';
        case 13: // Command+enter
          return 'toggle-completion';
        case 222: // Command+'
          return 'go-to-home';
        case 8: // cmd+shift+backspace
          if (e.shiftKey) {
            return 'delete-item';
          } else {
            return getDefaultKeyBinding(e);
          }
        default:
          return getDefaultKeyBinding(e);
      }
    } else {
      if (e.keyCode === 9) {
        return handleTab(e);
      }
    }

    return getDefaultKeyBinding(e);
  }

  function zoomIn() {
    const { anchorKey } = pluckGoodies(editorState);
    zoomTo(anchorKey);
  }

  function zoomOut() {
    // find the parent of the current zoomed in item, or nothing/root, if the
    // item zoomed in is a first level list item, and then set correct url
    const { editorState, zoomedInItemId } = state;

    // if there is no zoomed item, that means there's nothing to zoom out into
    // we are at the root
    if (!zoomedInItemId) {
      console.log('nothing is zoomed in so nothing to zoom out.');
      return;
    }

    const parentBlockOfZoomedInBlock = findParent(editorState, zoomedInItemId);

    if (parentBlockOfZoomedInBlock) {
      zoomTo(parentBlockOfZoomedInBlock.getKey());
    }
  }

  function collapse() {
    const { anchorKey } = pluckGoodies(state.editorState);

    if (anchorKey) {
      dispatch({ type: COLLAPSE_ITEM, blockKey: anchorKey });
    }
  }

  function expand() {
    const { anchorKey } = pluckGoodies(state.editorState);

    if (anchorKey) {
      dispatch({ type: EXPAND_ITEM, blockKey: anchorKey });
    }
  }

  const moveUp = React.useCallback(() => {
    dispatch({ type: MOVE_UP });
  }, [dispatch]);

  const moveDown = React.useCallback(() => {
    dispatch({ type: MOVE_DOWN });
  }, [dispatch]);

  const toggleCompletion = React.useCallback(() => {
    dispatch({ type: TOGGLE_COMPLETION });
  }, [dispatch]);

  const goToHome = React.useCallback(() => {
    window.location.hash = '';
  }, []);

  const deleteCurrentItem = React.useCallback(() => {
    dispatch({ type: DELETE_CURRENT_ITEM });
  }, [dispatch]);

  type EditorCommand = DraftEditorCommand | string;
  function handleKeyCommand(command: EditorCommand): DraftHandleValue {
    switch (command) {
      case 'move-up':
        moveUp();
        return 'handled';
      case 'move-down':
        moveDown();
        return 'handled';
      case 'collapse-list':
        collapse();
        return 'handled';
      case 'expand-list':
        expand();
        return 'handled';
      // this is called when user presses the Enter or Return key
      case 'split-block':
        // TODO: this causes a major bug when the block to split is collapsed
        // The data inside the collapsed item vanishes
        // Which means, we need to implement our own split block :()
        // don't allow any new block creation when in search mode
        if (!searchText) {
          setEditorState(splitBlock(editorState, state.zoomedInItemId));
        }
        return 'handled';
      case 'zoom-in':
        zoomIn();
        return 'handled';
      case 'zoom-out':
        zoomOut();
        return 'handled';
      case 'toggle-completion':
        toggleCompletion();
        return 'handled';
      case 'backspace':
        // eslint-disable-next-line no-case-declarations
        const { contentState, blockMap, selectionState } = pluckGoodies(
          state.editorState
        );
        // eslint-disable-next-line no-case-declarations
        const block = blockMap.get(selectionState.getAnchorKey());

        // if cursor is at the start of the list
        if (block.getText() === '' || selectionState.getAnchorOffset() === 0) {
          // 1. Don't allow deleting any non-leaf item this way. Causes other
          // problems. It's consistent with how workflowy does it too.
          // , don't do anything
          // 2. also don't do anything when this item is the only item in the
          // blockMap
          // 3. also don't delete first item in the list - that item will not have
          // any previous sibling
          // 4. first item in zoomed in state - key same as zoomedInItemId
          const pSibling = contentState.getBlockBefore(block.getKey());

          if (
            blockMap
              .get(selectionState.getAnchorKey())
              .getIn(['data', 'hasChildren']) ||
            !pSibling ||
            // accounting for every present ROOT block
            blockMap.count() === 2 ||
            block.getKey() === state.zoomedInItemId
          ) {
            return 'handled';
          } else {
            // else, delete the block
            // even if this item has children, they will either become the
            // previous siblings children or siblings
            return 'not-handled';
          }
        } else {
          return 'not-handled';
        }
      case 'go-to-home':
        goToHome();
        return 'handled';
      case 'delete-item':
        deleteCurrentItem();
        return 'handled';
      default:
        // eslint-disable-next-line no-case-declarations
        const newState = RichUtils.handleKeyCommand(editorState, command);

        if (newState) {
          setEditorState(newState);
          return 'handled';
        }

        return 'not-handled';
    }
  }

  function handleChange(editorState: EditorState) {
    const { contentState, anchorBlock, selectionState } = pluckGoodies(
      editorState
    );

    let newState = editorState;

    // if somehow a change takes users out of list item type, force the block
    // back to 'unordered-list-item' type
    if (anchorBlock && anchorBlock.getType() !== 'unordered-list-item') {
      const newContentState = Modifier.setBlockType(
        contentState,
        selectionState,
        'unordered-list-item'
      );
      // TODO: What should be the change type here?
      newState = EditorState.push(
        editorState,
        newContentState,
        'force-list-type' as any
      );
    }

    dispatch({ type: CHANGE, editorState: newState });
  }

  const handleIndentClick = React.useCallback(() => {
    dispatch({ type: INDENT });
  }, [dispatch]);

  const handleOutdentClick = React.useCallback(() => {
    dispatch({ type: DEDENT });
  }, [dispatch]);

  // TODO -
  // Adding search brings in a lot of complexity. What happens when users
  // searches something and then goes ahead and changes the filtered
  // list of items
  //    Ans - we can maintain a focus state for search input and only filter
  //    blocks when the search input is in focus
  // What happens if the search term is still there and user zooms out?
  //    Ans - maybe we can clean the search text on zoom out
  // When user searches something and then edits an item from the filtered
  // list, draft-js onChange now sends back the filtered blocks in the
  // changed editorState, which is what we store in our store. Which means
  // we lose the unfiltered data once users start editing filtered data.
  //    Ans - maintain another state variable called unfiltered data?
  //    Or, instead of filtering the blocks and sending to draft-js editor,
  //    just send the searchText to Item component and let it show/hide
  //    that item based on the searchText. Yesssss.
  // When user creates new item when in search mode. As soon as they type
  // something in that block, it disappears because it doesn't match the
  // search string. Can not let that happen by comparing the time stamps
  // of last search input change and block update timestamp. If the block
  // was created after the last search input was made, don't apply the
  // search filter on it.

  function handleAddNewItem() {
    // add new item to the end of the list
    // Make sure that it's at the end of the zoomed in list
    dispatch({
      type: SET_EDITOR_STATE,
      editorState: addEmptyBlockToEnd(
        state.editorState,
        zoomedInItemId,
        baseDepth + 1
      ),
    });
  }

  // TODO: if we move this to our reducer, we can then cache using React.useCallback((), [dispatch])
  // set collapsed to false for every block
  const handleExpandAllClick = React.useCallback(() => {
    dispatch({ type: EXPAND_ALL });
  }, [dispatch]);

  // keep calling collapseBlock for all the blocks
  // works like a charm
  const handleCollapseAllClick = React.useCallback(() => {
    dispatch({ type: COLLAPSE_ALL });
  }, [dispatch]);

  // For times when user tabs through rest of the elements in our page
  // The editor itself will also be focusable
  function handleWrapperFocus() {
    focusEditor();
  }

  function handlePastedText(pastedText: string) {
    setEditorState(pasteText(editorState, pastedText));
    return 'handled' as DraftHandleValue;
  }

  // function handleshowboardviewclick() {
  //   if (zoomedInItemId !== ROOT_KEY) {
  //     console.log('board view activated');
  //     setShowBoardView(!showBoardView);
  //   } else {
  //     alert('Cannot show board view at root level');
  //   }
  // }

  // This is to cache the object we set as value for EditorDispatchContext
  // If we don't do this, we create a new object on every render
  // Which then rerenders every component accessing anything from the
  // EditorDispatchContext
  React.useEffect(() => {
    editorDispatchContextValue = {
      onZoom: zoomTo,
      onExpandClick: expandParticularBlock,
      onCollapseClick: collapseParticularBlock,
    };
  }, [zoomTo, expandParticularBlock, collapseParticularBlock]);

  const handleBookmarkClick = React.useCallback(() => {
    dispatch({ type: BOOKMARK });

    if (typeof onBookmarkClick === 'function') {
      onBookmarkClick();
    }
  }, [dispatch, onBookmarkClick]);

  // className="flex flex-col w-full p-10 pt-3 pl-6 mb-12 sm:pl-10 sm:shadow-sm rounded-md"
  return (
    <div className="editor deepnotes-editor-theme-light">
      {withToolbar && (
        <Menu
          onExpandAllClick={handleExpandAllClick}
          onCollapseAllClick={handleCollapseAllClick}
          onIndentClick={handleIndentClick}
          onOutdentClick={handleOutdentClick}
          onToggleCompletionClick={toggleCompletion}
          isBookmarked={
            editorState &&
            !!editorState
              .getCurrentContent()
              .getBlockMap()
              .get(zoomedInItemId)
              .getIn(['data', 'bookmarked'])
          }
          onBookmarkClick={handleBookmarkClick}
        />
      )}
      <div
        className={styles.container}
        tabIndex={0}
        onFocus={handleWrapperFocus}
        style={{ minHeight: 300, ...editorWrapperStyle }}
      >
        <EditorContext.Provider value={editorDispatchContextValue}>
          <Editor
            webDriverTestID="dumpster-editor"
            textAlignment="left"
            ref={editor}
            editorState={editorState}
            onChange={handleChange}
            blockRendererFn={blockRendererFn}
            handleReturn={handleReturn}
            handlePastedText={handlePastedText}
            stripPastedStyles={true}
            keyBindingFn={keyBindingFn}
            handleKeyCommand={handleKeyCommand}
            onFocus={() => console.log('editor got focus')}
            placeholder="Start writing"
            blockStyleFn={blockDepthStyleFn}
            customStyleMap={{
              CODE: {
                color: '#15141f',
                background: '#eae9ed',
                fontFamily:
                  'Monaco,Menlo,Ubuntu Mono,Droid Sans Mono,Consolas,monospace',
                fontSize: '0.9em',
                padding: '0 0.25rem',
                margin: '0 0.0625rem',
                borderRadius: '0.125rem',
                overflowWrap: 'break-word',
                wordWrap: 'break-word',
              },
            }}
          />
          <ListNestingStyles max={40} />
        </EditorContext.Provider>
        <button
          className={classNames(
            buttonStyles['button'],
            buttonStyles['icon-button'],
            styles['new-item-button']
          )}
          onClick={handleAddNewItem}
          aria-label="Add new item"
          title="Add new item"
        >
          <PlusSign
            className={styles['new-item-icon']}
            aria-label="Add new item"
          />
        </button>
      </div>
    </div>
  );
}

export default React.memo(DeepnotesEditor);
