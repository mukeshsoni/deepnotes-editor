import Immutable, { List } from 'immutable';
import {
  CharacterMetadata,
  ContentBlock,
  EditorState,
  ContentState,
  genKey,
  SelectionState,
} from 'draft-js';

import { getPosNum } from './pos_generators';
import { createDecorators } from './decorators';

interface ContentBlockConfig {
  key: string;
  text: string;
  depth: number;
  characterList: List<CharacterMetadata>;
}

export function getNewContentBlock(config: Partial<ContentBlockConfig>) {
  return new ContentBlock({
    key: genKey(),
    type: 'unordered-list-item',
    text: '',
    depth: 0,
    ...config,
  });
}

export function getEmptyBlock() {
  return getNewContentBlock({ text: '' });
}

export function getRootBlock(rootId: string) {
  return getNewContentBlock({ text: '', key: rootId });
}

export function getEmptySlateState(rootId: string) {
  const firstItem = getEmptyBlock()
    .set('depth', 1)
    .set(
      'data',
      Immutable.Map({ parentId: rootId, pos: getPosNum(1) })
    ) as ContentBlock;
  const rootBlock = getRootBlock(rootId);
  // we add 2 blocks in our empty slate because
  // if we add only the root block, draftjs will then allow editing of the
  // root block item.
  // That problem goes away when i set the zoomedInItemId as 'root'. Hmm.
  // But then there's no starting item to work with. Which is why we need
  // the second empty block
  const firstBlocks = [rootBlock, firstItem];

  // // How to get started with a list item by default
  // // Which is what workflowy does
  // // Just call RichUtils.toggleBlockType with the empty state we create at
  // // the beginning with 'unordered-list-item'
  // RichUtils.toggleBlockType(EditorState.createEmpty(), "unordered-list-item")
  // );
  let emptySlate = EditorState.createWithContent(
    ContentState.createFromBlockArray(firstBlocks),
    createDecorators()
  );
  emptySlate = EditorState.forceSelection(
    emptySlate,
    SelectionState.createEmpty(firstItem.getKey())
  );

  return emptySlate;
}
