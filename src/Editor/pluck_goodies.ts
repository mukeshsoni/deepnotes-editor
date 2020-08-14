import { EditorState } from 'draft-js';

export default function pluckGoodies(editorState: EditorState) {
  const contentState = editorState.getCurrentContent();
  const selectionState = editorState.getSelection();
  const blockMap = contentState.getBlockMap();
  const anchorKey = selectionState.getAnchorKey();
  const anchorBlock = contentState.getBlockForKey(anchorKey);
  const focusKey = selectionState.getFocusKey();
  const focusBlock = contentState.getBlockForKey(focusKey);

  return {
    contentState,
    selectionState,
    blockMap,
    anchorKey,
    anchorBlock,
    focusKey,
    focusBlock,
  };
}
