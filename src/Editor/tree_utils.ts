import * as Immutable from 'immutable';
import { BlockMap, ContentBlock } from 'draft-js';

import { calculateDepth } from './calculate_depth';

export function hasChildren(blockMap: BlockMap, blockKey: string): boolean {
  return !!blockMap.find(
    b => !!(b && b.getIn(['data', 'parentId']) === blockKey)
  );
}

// TODO: Is it a better idea to get all children, sortByPos, and then return the first block?
// right now, we are relying on the fact that draft-js blocks are sorted by the order they appear in
export function getFirstChild(
  blockMap: BlockMap,
  blockKey: string
): ContentBlock | undefined {
  return blockMap.find(
    b => !!(b && b.getIn(['data', 'parentId']) === blockKey)
  );
}

export function getChildren(blockMap: BlockMap, blockKey: string) {
  return blockMap.filter(
    b => !!(b && b.getIn(['data', 'parentId']) === blockKey)
  );
}

export function getNextSibling(blockMap: BlockMap, blockKey: string) {
  const block = blockMap.get(blockKey);
  const parentId = block.getIn(['data', 'parentId']);

  return blockMap
    .filter(b => !!(b && b.getIn(['data', 'parentId']) === parentId))
    .find(
      b => !!(b && b.getIn(['data', 'pos']) > block.getIn(['data', 'pos']))
    );
}

export function getPreviousSibling(blockMap: BlockMap, blockKey: string) {
  const block = blockMap.get(blockKey);
  const parentId = block.getIn(['data', 'parentId']);

  return blockMap
    .filter(b => !!(b && b.getIn(['data', 'parentId']) === parentId))
    .reverse()
    .find(
      b => !!(b && b.getIn(['data', 'pos']) < block.getIn(['data', 'pos']))
    );
}

/**
 * It returns block with all it's descendants, not just it's children
 * Everything inside tree with the block as the root node
 * @param blockMap
 * @param blockKey
 */
export function getBlocksWithItsDescendants(
  blockMap: BlockMap,
  blockKey: string
): Immutable.Iterable<string, ContentBlock> {
  const block = blockMap.get(blockKey);

  return blockMap
    .toSeq()
    .skipUntil((_, k) => k === blockKey)
    .takeWhile(
      (b, k) =>
        !!(
          b &&
          (k === blockKey ||
            calculateDepth(blockMap, b.getKey()) >
              calculateDepth(blockMap, block.getKey()))
        )
    );
}
