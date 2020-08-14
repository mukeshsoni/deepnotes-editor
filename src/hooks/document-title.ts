import * as React from 'react';
import { EditorState } from 'draft-js';

import { ROOT_KEY } from '../constants';

export default function useDocumentTitle(
  editorState: EditorState,
  zoomedInItemId: string
) {
  const rootDocumentTitle = 'deepnotes - Note taking made easy. And deep.';

  React.useEffect(() => {
    if (zoomedInItemId === ROOT_KEY) {
      document.title = rootDocumentTitle;
    } else {
      const blockMap = editorState.getCurrentContent().getBlockMap();
      const zoomedInItemText = blockMap.get(zoomedInItemId).getText();

      document.title = zoomedInItemText;
    }
  }, [editorState, zoomedInItemId]);
}
