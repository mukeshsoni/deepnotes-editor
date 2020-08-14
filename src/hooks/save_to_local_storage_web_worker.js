import * as Comlink from 'comlink';
import { convertToRaw } from 'draft-js';

// eslint-disable-next-line
import Worker from 'worker-loader!./worker';

const w = new Worker();
const save = Comlink.wrap(w);

export function saveToLocalStorage(contentState) {
  save(convertToRaw(contentState));
}
