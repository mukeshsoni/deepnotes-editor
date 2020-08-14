import * as Comlink from 'comlink';
import localForage from 'localforage';
import { LOCAL_STORAGE_KEY } from '../constants';

async function save(contentState) {
  // need to save update_time so that if changes were made offline,
  // on a fresh reload we can decide whether to show content from
  // localForage or remote data backup
  await localForage
    .setItem(LOCAL_STORAGE_KEY, {
      // eslint-disable-next-line @typescript-eslint/camelcase
      update_time: new Date().getTime() / 1000,
      content: contentState,
    })
    .catch(e => {
      console.error('Error saving content to local forage', e);
    });
}

Comlink.expose(save);
