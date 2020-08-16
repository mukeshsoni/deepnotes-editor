import {
  ContentBlock,
  Modifier,
  SelectionState,
  EditorState,
  ContentState,
  convertFromRaw,
} from 'draft-js';

import { getNewContentBlock } from './Editor/block_creators';
import largeJson from './fixtures/playground_list.json';
import { getChildren } from './Editor/tree_utils';
import { ROOT_KEY, BASE_POS } from './constants';
import { sanitizePosAndDepthInfo } from './Editor/sanitize_pos_and_depth_info';

export function getBlocks(editorState: EditorState) {
  const contentState = editorState.getCurrentContent();
  return contentState.getBlocksAsArray();
}

export const moveFocus = (
  editorState: EditorState,
  row: number,
  col: number
) => {
  const selection = editorState.getSelection();
  const blocks = getBlocks(editorState);
  const blockKey = blocks[row].getKey();

  // let's move focus to the 3rd character in the line
  const newSelection = selection.merge({
    focusKey: blockKey,
    anchorKey: blockKey,
    focusOffset: col,
    anchorOffset: col,
  }) as SelectionState;
  return EditorState.forceSelection(editorState, newSelection);
};

// loads the large json fixture so that there's already a complicated state
// to start testing thing on
export const sampleStateLarge = () => {
  let editorState = sanitizePosAndDepthInfo(
    EditorState.createWithContent(convertFromRaw(largeJson.content)),
    ROOT_KEY
  );

  // focus the first block. The 0th block is invisible root block.
  editorState = moveFocus(editorState, 1, 0);

  return editorState;
};

export const printBlocks = (editorState: EditorState) => {
  console.log(
    getBlocks(editorState).map(b => b.toJS()),
    getBlocks(editorState).length
  );
};

export const getBlock = (editorState: EditorState, blockNumber: number) => {
  return getBlocks(editorState)[blockNumber];
};

export const getParentId = (editorState: EditorState, blockNumber: number) => {
  const blocks = getBlocks(editorState);
  return blocks[blockNumber].get('data').get('parentId');
};

export const getPosNumber = (editorState: EditorState, blockNumber: number) => {
  const blocks = getBlocks(editorState);
  return blocks[blockNumber].get('data').get('pos');
};

export const assertParentId = (
  editorState: EditorState,
  blockNumber: number,
  expectedParentId: string
) => {
  expect(getParentId(editorState, blockNumber)).toEqual(expectedParentId);
};

export const assertBlockPos = (
  editorState: EditorState,
  blockNumber: number,
  expectedPos: string
) => {
  expect(getPosNumber(editorState, blockNumber)).toEqual(expectedPos);
};

export const addNewBlock = (
  editorState: EditorState,
  text: string,
  depth = 0
) => {
  const contentState = editorState.getCurrentContent();
  let blockMap = contentState.getBlockMap();
  const block = getNewContentBlock({ text, depth })
    .setIn(
      ['data', 'pos'],
      getChildren(blockMap, ROOT_KEY)
        .last()
        .getIn(['data', 'pos']) + BASE_POS
    )
    .setIn(['data', 'parentId'], ROOT_KEY) as ContentBlock;

  blockMap = blockMap.set(block.getKey(), block);
  const newContentState = contentState.merge({
    blockMap,
  }) as ContentState;

  return EditorState.push(editorState, newContentState, 'add-new-block' as any);
};

// TODO: Is it a good idea to update depth without updating parentId?
export const updateBlockDepth = (
  editorState: EditorState,
  blockNumber: number,
  newDepth: number
) => {
  const contentState = editorState.getCurrentContent();
  const blockMap = contentState.getBlockMap();
  const blocks = contentState.getBlocksAsArray();
  let blockToUpdate = blocks[blockNumber];
  blockToUpdate = blockToUpdate.set('depth', newDepth) as ContentBlock;
  const newContentState = contentState.merge({
    blockMap: blockMap.set(blockToUpdate.getKey(), blockToUpdate),
  }) as ContentState;

  return EditorState.push(editorState, newContentState, 'update-text' as any);
};

export const updateText = (
  editorState: EditorState,
  blockNumber: number,
  text: string
) => {
  const contentState = editorState.getCurrentContent();
  const blocks = contentState.getBlocksAsArray();
  const blockToUpdate = blocks[blockNumber];
  // selection tells Modifier.replaceText which block to target for replacement
  const selection = SelectionState.createEmpty(blockToUpdate.getKey());

  return EditorState.push(
    editorState,
    Modifier.replaceText(contentState, selection, text),
    'update-text' as any
  );
};

export const assertBlockCount = (editorState: EditorState, n: number) => {
  const contentState = editorState.getCurrentContent();
  const blocks = contentState.getBlocksAsArray();

  expect(blocks).toHaveLength(n);
};

export const assertBlockText = (
  editorState: EditorState,
  blockNumber: number,
  text: string
) => {
  const contentState = editorState.getCurrentContent();
  const blocks = contentState.getBlocksAsArray();

  expect(blocks[blockNumber].getText()).toEqual(text);
};

export const assertBlockDepth = (
  editorState: EditorState,
  blockNumber: number,
  expectedDepth: number
) => {
  const block = getBlock(editorState, blockNumber);

  expect(block.getDepth()).toEqual(expectedDepth);
};
