import { expandBlock, collapseBlock } from '../collapse_expand_block';

import { getBlock, sampleStateLarge } from '../../testHelpers';

describe('collapse block', () => {
  it('should collapse the block we ask it to', () => {
    let editorState = sampleStateLarge();
    let blockToCollapseIndex = 9;

    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);

    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToCollapseIndex).getKey()
    );

    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(true);

    blockToCollapseIndex = 1;
    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToCollapseIndex).getKey()
    );

    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(true);
  });

  it('should not collapse a block if that block does not have children', () => {
    let editorState = sampleStateLarge();
    const blockToCollapseIndex = 2;

    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);

    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToCollapseIndex).getKey()
    );

    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);
  });

  it('should keep a collapsed block collapsed', () => {
    let editorState = sampleStateLarge();
    const blockToCollapseIndex = 1;

    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);

    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToCollapseIndex).getKey()
    );
    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(true);
    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToCollapseIndex).getKey()
    );
    expect(
      getBlock(editorState, blockToCollapseIndex).getIn(['data', 'collapsed'])
    ).toBe(true);
  });
});

describe('expand block', () => {
  it('should expand the block we ask it to', () => {
    let editorState = sampleStateLarge();
    const blockToExpandIndex = 1;

    expect(
      getBlock(editorState, blockToExpandIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);

    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToExpandIndex).getKey()
    );
    editorState = expandBlock(
      editorState,
      getBlock(editorState, blockToExpandIndex).getKey()
    );

    expect(
      getBlock(editorState, blockToExpandIndex).getIn(['data', 'collapsed'])
    ).toBe(false);
  });

  it('should not expand the block if it is does not have children', () => {
    let editorState = sampleStateLarge();
    const blockToExpandIndex = 2;

    expect(
      getBlock(editorState, blockToExpandIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);

    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToExpandIndex).getKey()
    );
    editorState = expandBlock(
      editorState,
      getBlock(editorState, blockToExpandIndex).getKey()
    );

    expect(
      getBlock(editorState, blockToExpandIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);
  });

  it('should keep an expanded block expanded', () => {
    let editorState = sampleStateLarge();
    const blockToExpandIndex = 5;

    expect(
      getBlock(editorState, blockToExpandIndex).getIn(['data', 'collapsed'])
    ).toBe(undefined);

    editorState = collapseBlock(
      editorState,
      getBlock(editorState, blockToExpandIndex).getKey()
    );
    editorState = expandBlock(
      editorState,
      getBlock(editorState, blockToExpandIndex).getKey()
    );
    expect(
      getBlock(editorState, blockToExpandIndex).getIn(['data', 'collapsed'])
    ).toBe(false);
    editorState = expandBlock(
      editorState,
      getBlock(editorState, blockToExpandIndex).getKey()
    );
    expect(
      getBlock(editorState, blockToExpandIndex).getIn(['data', 'collapsed'])
    ).toBe(false);
  });
});
