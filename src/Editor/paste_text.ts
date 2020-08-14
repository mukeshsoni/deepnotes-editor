import { EditorState, Modifier } from 'draft-js';
import pluckGoodies from './pluck_goodies';

export function pasteText(
  editorState: EditorState,
  pastedText: string
): EditorState {
  const { contentState, selectionState } = pluckGoodies(editorState);

  return EditorState.push(
    editorState,
    Modifier.replaceText(contentState, selectionState, pastedText),
    'paste-text' as any
  );
}
