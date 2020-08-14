import { BlockMap, ContentBlock } from 'draft-js';

function sortByPos(arr: Array<ContentBlock>) {
  const newArr = [...arr];

  newArr.sort((item1, item2) => {
    // @ts-ignore
    return item1.getIn(['data', 'pos']) - item2.getIn(['data', 'pos']);
  });

  return newArr;
}

/**
 * Given a blockMap and a block id, this function traverses the tree from the given block id and returns all blocks under that tree
 * It makes some changes to the children as it traverses them
 *  1. It sorts the children by pos
 *  2. It updates the depth information
 */
export function makeCorrectionsToNodeAndItsDescendants(
  blockMap: BlockMap,
  node: ContentBlock
): Array<ContentBlock> {
  const nodeDepth = node.getDepth();
  const nodeKey = node.getKey();

  const children = sortByPos(
    blockMap
      .filter(b => !!(b && b.getIn(['data', 'parentId']) === nodeKey))
      .map((b?: ContentBlock) => {
        return (b ? b.set('depth', nodeDepth + 1) : b) as ContentBlock;
      })
      .toArray()
  );

  // termination condition. The node is a leaf node.
  if (!children) {
    return [node];
  }

  return [node].concat(
    children
      .map((child: ContentBlock) =>
        makeCorrectionsToNodeAndItsDescendants(blockMap, child)
      )
      .flat()
  );
}
