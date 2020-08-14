import { BASE_POS } from '../constants';

export function getPosNum(pos: number) {
  return pos * BASE_POS;
}

export function getPosInBetween(posStart: number, posEnd: number) {
  return Math.round((posStart + posEnd) / 2);
}

export function getPosAfter(lastPos: number) {
  return lastPos + BASE_POS;
}
