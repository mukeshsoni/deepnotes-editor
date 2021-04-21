import {
  ContentBlock,
  BlockMap,
  EditorState,
  ContentState,
  SelectionState,
} from 'draft-js';

import { ROOT_KEY } from '../constants';

import pluckGoodies from './pluck_goodies';
import { getPosNum } from './pos_generators';
import { getEmptySlateState } from './block_creators';
import { createDecorators } from './decorators';
import { hasChildren } from './tree_utils';

function blocksWithSanitizedPosAndDepthAndHasChildren(
  blockMap: BlockMap,
  node: ContentBlock
): Array<ContentBlock> {
  const nodeKey = node.getKey();
  const nodeDepth = node.getDepth();

  const children = blockMap
    .filter(b => !!(b && b.getIn(['data', 'parentId']) === nodeKey))
    .toArray()
    .map((block, index) => {
      return block
        .setIn(['data', 'pos'], getPosNum(index + 1))
        .setIn(['data', 'hasChildren'], hasChildren(blockMap, block.getKey()))
        .set('depth', nodeDepth + 1);
    }) as Array<ContentBlock>;

  if (!children) {
    return [node];
  }

  return [node].concat(
    children
      .map((child: ContentBlock) =>
        blocksWithSanitizedPosAndDepthAndHasChildren(blockMap, child)
      )
      .flat()
  );
}

/**
 * We have wrong pos information stored in the blocks some times. Don't know the root cause.
 * It causes many operations to behave in the wrong way. E.g. Dedent a child of an item with wrong pos causes the child item to move in an unpredictable manner.
 * move-up and move-down also start working weirdly.
 * So we sanitize or correct the pos information before we render anything.
 * The next time this data is saved, it's alright.
 * @param editorState
 */
export function sanitizePosAndDepthInfo(
  editorState: EditorState,
  rootKey: string
) {
  const { blockMap } = pluckGoodies(editorState);

  if (!blockMap || blockMap.count() < 1) {
    return getEmptySlateState(ROOT_KEY);
  }

  const blocks = blocksWithSanitizedPosAndDepthAndHasChildren(
    blockMap,
    blockMap.get(rootKey)
  );

  const newEditorState = EditorState.createWithContent(
    ContentState.createFromBlockArray(blocks),
    createDecorators()
  );
  let selection;
  if (blocks.length > 1) {
    selection = SelectionState.createEmpty(blocks[1].getKey());
  } else if (blocks.length > 0) {
    selection = SelectionState.createEmpty(blocks[0].getKey());
  } else {
    return newEditorState;
  }

  return EditorState.forceSelection(newEditorState, selection);
}
