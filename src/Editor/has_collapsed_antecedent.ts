import { BlockMap } from 'draft-js';

/**
 * Find if parent or grandparent or some other ancestor in the tree is collapsed
 */
export function hasCollapsedAntecedent(
  blockMap: BlockMap,
  blockKey: string,
  zoomedInItemId?: string
) {
  const collapsed = false;

  const block = blockMap.get(blockKey);

  if (!block) {
    return collapsed;
  }

  let parentBlock = blockMap.get(block.getIn(['data', 'parentId']));

  while (parentBlock) {
    if (zoomedInItemId && parentBlock.getKey() === zoomedInItemId) {
      break;
    }

    if (parentBlock.getIn(['data', 'collapsed'])) {
      return true;
    }

    parentBlock = blockMap.get(parentBlock.getIn(['data', 'parentId']));
  }

  return collapsed;
}
