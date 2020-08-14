import { EditorState } from 'draft-js';

import pluckGoodies from './pluck_goodies';
import { calculateDepth } from './calculate_depth';

export function findParent(editorState: EditorState, blockKey: string) {
  const { blockMap } = pluckGoodies(editorState);
  const block = blockMap.get(blockKey);

  const parentBlock = blockMap
    .toSeq()
    .takeUntil((_, k) => k === blockKey)
    .reverse()
    .skipWhile(
      b =>
        !!(
          b &&
          calculateDepth(blockMap, b.getKey()) >=
            calculateDepth(blockMap, block.getKey())
        )
    )
    .first();

  return parentBlock;
}
