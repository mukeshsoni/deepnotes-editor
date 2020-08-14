import linkify from 'linkify-it';
import memoizeOne from 'memoize-one';
import { ContentBlock, CompositeDecorator } from 'draft-js';
import escapeStringRegexp from 'escape-string-regexp';

import Hashtag from './components/Hashtag';
import SearchHighlight from './components/SearchHighlight';
import Link from './components/Link';

const linkifyInstance = linkify();
const HASHTAG_REGEX = /#[\w\u0590-\u05ff]+/g;

type Callback = (start: number, end: number) => void;

function findWithRegex(
  regex: RegExp,
  contentBlock: ContentBlock,
  callback: Callback
) {
  const text = contentBlock.getText();
  let matchArr, start;
  while ((matchArr = regex.exec(text)) !== null) {
    start = matchArr.index;
    callback(start, start + matchArr[0].length);
  }
}

function hashtagStrategy(contentBlock: ContentBlock, callback: Callback) {
  findWithRegex(HASHTAG_REGEX, contentBlock, callback);
}

function findLinkEntities(
  contentBlock: ContentBlock,
  callback: (start: number, end: number) => void
) {
  const links = linkifyInstance.match(contentBlock.getText());
  if (links) {
    links.forEach((link: any) => callback(link.index, link.lastIndex));
  }
}

export const createDecorators = memoizeOne((searchText = '') => {
  const regex = new RegExp(escapeStringRegexp(searchText), 'gi');

  return new CompositeDecorator([
    {
      strategy: hashtagStrategy,
      component: Hashtag,
    },
    {
      strategy: (contentBlock, callback) => {
        if (searchText) {
          findWithRegex(regex, contentBlock, callback);
        }
      },
      component: SearchHighlight,
    },
    { strategy: findLinkEntities, component: Link },
  ]);
});
