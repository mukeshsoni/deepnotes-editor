import { ContentState, SelectionState } from 'draft-js';

import { getBlocksWithItsDescendants } from './tree_utils';

/**
 * This is not a generic start and end keys function
 * It's very specific in that it finds the first item which is either a sibling
 * of the start item or higher than that. I.e. it finds all the children of the
 * first item
 * TODO: Can't we reuse getBlocksWithItsChildren here?
 */
export function getStartAndEndKeys(
  contentState: ContentState,
  selectionState: SelectionState
) {
  const startBlockKey = selectionState.getAnchorKey();
  const blockWithItsChildren = getBlocksWithItsDescendants(
    contentState.getBlockMap(),
    startBlockKey
  );

  return [
    blockWithItsChildren.first().getKey(),
    blockWithItsChildren.last().getKey(),
  ];
}
