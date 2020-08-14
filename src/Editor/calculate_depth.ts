import { BlockMap } from 'draft-js';

export function calculateDepth(
  blockMap: BlockMap,
  blockKey: string,
  zoomedInItemId?: string
) {
  let depth = -1;
  const block = blockMap.get(blockKey);

  if (!block) {
    return depth;
  }

  let parentBlock = blockMap.get(block.getIn(['data', 'parentId']));

  while (parentBlock) {
    if (zoomedInItemId && parentBlock.getKey() === zoomedInItemId) {
      break;
    }

    depth += 1;
    parentBlock = blockMap.get(parentBlock.getIn(['data', 'parentId']));
  }

  return depth;
}
