import * as React from 'react';
import { EditorState, ContentBlock, ContentState } from 'draft-js';

import debounce from '../debounce';
import { saveDumpsterContent, isConnected, getAutosavePref } from '../dropbox';
import {
  remoteOperationState,
  AppActions,
  SET_SAVING_PROGRESS_STATE,
} from '../app_state';
import { saveToLocalStorage as stls } from './save_to_local_storage_web_worker';

import usePrevious from './previous';

export function saveToDropbox(
  contentState: ContentState,
  dispatch: React.Dispatch<AppActions>
) {
  dispatch({
    type: SET_SAVING_PROGRESS_STATE,
    savingToRemote: remoteOperationState.inProgress,
  });
  saveDumpsterContent(contentState)
    .then(() => {
      dispatch({
        type: SET_SAVING_PROGRESS_STATE,
        savingToRemote: remoteOperationState.done,
      });
    })
    .catch(e => {
      console.error('error uploading file to dropbox', e);

      dispatch({
        type: SET_SAVING_PROGRESS_STATE,
        savingToRemote: remoteOperationState.failed,
      });
    });
}

// protip - never define a debouced function inside the function component. It get's
// defined again and again as  new deboucned function on every render and
// each one is a different instance of debounced function and so none works
const debouncedSaveToDropbox = debounce(saveToDropbox, 1000);

const saveToLocalStorage = debounce(stls, 500);

function getTextFromContentState(contentState: ContentState) {
  return contentState
    .getBlockMap()
    .toIndexedSeq()
    .map((b?: ContentBlock) => (b ? b.getText() : ''))
    .toArray()
    .join('');
}

export function useSaveData(
  dispatch: React.Dispatch<AppActions>,
  editorState: EditorState,
  zoomedInItemId: string,
  loading?: boolean
) {
  const previousEditorState = usePrevious(editorState);
  // save editorState to localForage
  React.useEffect(() => {
    // TODO: Move this code to state manager too?
    const currentContentState = editorState.getCurrentContent();

    // only save if the state is not loading
    const contentState = editorState.getCurrentContent();

    let previousContentState;

    if (previousEditorState !== undefined) {
      previousContentState = previousEditorState.getCurrentContent();
    }

    // TODO: works wrong when we first load content from dropbox. The contentState
    // changes from empty to what's in dropbox and we save that again.
    // We should not save it to dropbox after the first load
    if (
      !loading &&
      previousContentState !== contentState &&
      // let's not save if the content state is empty
      // That might be the case when the user opens deepnotes on a new device for the first time and then connects to dropbox
      contentState.getPlainText() !== ''
    ) {
      // if we are connected to dropbox, it means we have gotten data from
      // dropbox. And if the previousContentState has empty text, it means we
      // went from initial empty content to content from dropbox during a fresh
      // load. Let's not save it back to dropbox.
      try {
        if (
          previousContentState &&
          getTextFromContentState(previousContentState) === '' &&
          isConnected()
        ) {
          return;
        }
      } catch (e) {
        // putting the whole thing inside try catch because the
        // getTextFromContentState is not tested and might blow  the whole app
        console.error(
          'something went wrong while getting text for previousContentState',
          e
        );
      }

      saveToLocalStorage(currentContentState);

      getAutosavePref().then(autosavePref => {
        if (autosavePref) {
          debouncedSaveToDropbox(currentContentState, dispatch);
        }
      });
    }
  }, [dispatch, editorState, loading, zoomedInItemId, previousEditorState]);
}
