import pluckGoodies from '../pluck_goodies';
import { calculateDepth } from '../calculate_depth';

import { getBlocks, sampleStateLarge } from '../../testHelpers';

describe('calculateDepth', () => {
  it('should calculate depth for a given block correctly', () => {
    const editorState = sampleStateLarge();
    const blocks = getBlocks(editorState);
    const { blockMap } = pluckGoodies(editorState);

    expect(calculateDepth(blockMap, blocks[0].getKey())).toEqual(-1);
    expect(calculateDepth(blockMap, blocks[1].getKey())).toEqual(0);
    expect(calculateDepth(blockMap, blocks[2].getKey())).toEqual(1);
    expect(calculateDepth(blockMap, blocks[3].getKey())).toEqual(1);
    expect(calculateDepth(blockMap, blocks[6].getKey())).toEqual(2);
    expect(calculateDepth(blockMap, blocks[9].getKey())).toEqual(3);
    expect(calculateDepth(blockMap, blocks[10].getKey())).toEqual(4);
    expect(calculateDepth(blockMap, blocks[17].getKey())).toEqual(4);
    expect(calculateDepth(blockMap, blocks[18].getKey())).toEqual(5);
    expect(calculateDepth(blockMap, blocks[22].getKey())).toEqual(3);
    expect(calculateDepth(blockMap, blocks[23].getKey())).toEqual(4);
    expect(calculateDepth(blockMap, blocks[32].getKey())).toEqual(3);
    expect(calculateDepth(blockMap, blocks[33].getKey())).toEqual(4);
    expect(calculateDepth(blockMap, blocks[38].getKey())).toEqual(3);
    expect(calculateDepth(blockMap, blocks[39].getKey())).toEqual(4);
    expect(calculateDepth(blockMap, blocks[42].getKey())).toEqual(4);
    expect(calculateDepth(blockMap, blocks[46].getKey())).toEqual(3);
    expect(calculateDepth(blockMap, blocks[47].getKey())).toEqual(4);
    expect(calculateDepth(blockMap, blocks[49].getKey())).toEqual(4);
  });
});
