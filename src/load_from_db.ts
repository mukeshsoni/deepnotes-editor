import { RawDraftContentBlock } from 'draft-js';

interface Database {
  get: (key: string) => RawDraftContentBlock;
  findAll: (config: {
    where?: { [key: string]: string };
  }) => Array<RawDraftContentBlock>;
}

function assert(assertion: boolean, message: string) {
  if (!assertion) {
    throw new Error(message);
  }
}

function nodeWithItsChildren(
  db: Database,
  nodeKey: string
): Array<RawDraftContentBlock> {
  const node = db.get(nodeKey);

  const children = db.findAll({ where: { 'data.parentId': nodeKey } });

  // termination condition. The node is a leaf node.
  if (!children) {
    return [node];
  }

  return [node].concat(
    children.map(child => nodeWithItsChildren(db, child.key)).flat()
  );
}

export function loadFromDb(db: Database, startNodeKey: string) {
  assert(
    typeof startNodeKey === 'string',
    'startNodeKey (second argument) has to be a string'
  );
  return nodeWithItsChildren(db, startNodeKey);
}
