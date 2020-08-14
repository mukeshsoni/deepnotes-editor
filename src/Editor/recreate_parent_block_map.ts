import { ContentState, BlockMap, SelectionState } from 'draft-js';

import { getStartAndEndKeys } from './start_and_end_keys';
import { makeCorrectionsToNodeAndItsDescendants } from './make_corrections_to_node_and_its_descendants';

/**
 * This function is super important for many edge cases of dedents
 * When an item in the middle of it's siblings is dedented, we can'j just
 * dedent that item and leave it there. It implies all it's siblings which
 * come after it will become it's children, which we don't want.
 * Just changing the parentId and pos of the dedented item means the data is
 * now correct, but the position of the block in our blockMap is not correct.
 * So we take the whole block of the dedented blocks new parent and regenrate
 * it based on the new parentId and pos data. That automatically puts the
 * dedented block in it's right place in the blockMap
 * TODO: This operation might be slow. Measure it's performance and tweak
 * it if required.
 * TODO: It does not work if the blocks are already not in correct position
 * E.g. I can't just set the parentId of some block to something new and
 * recreateParentBlockMap for that parentId and expect the block to be a child
 * of that new parent. Can we think of a way make sure that all items which
 * are supposed to be inside the given parentId are there?
 */
export function recreateParentBlockMap(
  contentState: ContentState,
  blockMap: BlockMap,
  parentId: string
): BlockMap {
  const selectionState = SelectionState.createEmpty(parentId);
  const [startKey, endKey] = getStartAndEndKeys(contentState, selectionState);
  const startIndex = blockMap.keySeq().findIndex(k => k === startKey);
  const endIndex = blockMap.keySeq().findIndex(k => k === endKey);

  // the main thing nodeWithItsChildren does is sort the children inside a parent by it's pos. We rely on that to ensure that the sorting is correct after we set change the pos of some block
  const recreatedContentState = ContentState.createFromBlockArray(
    makeCorrectionsToNodeAndItsDescendants(blockMap, blockMap.get(parentId))
  );
  const recreatedBlocks = recreatedContentState.getBlockMap();

  const recreatedBlockMap = blockMap
    .slice(0, startIndex)
    .concat(recreatedBlocks, blockMap.slice(endIndex + 1)) as BlockMap;

  return recreatedBlockMap;
}
