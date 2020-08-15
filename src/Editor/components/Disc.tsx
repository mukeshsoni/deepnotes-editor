import * as React from 'react';
import classNames from 'classnames';

import { EditorContext } from './EditorDispatchContext';
import DownArrow from '../../icons/DownArrow';

interface Props {
  collapsed: boolean;
  itemId: string;
  isCollapsible: boolean;
}

/*
 * 18. Tip - If i don't add `contentEditable={false}` in the Disc outer div,
 * clicking the mouse on the disc puts the cursor there, as if the whole disc
 * is content editable. I think draft-js, by default, makes all html elements
 * inside it as contenteditable. So if we don't want something as editable
 * entities, we have to specifiy it explicitly.
 *
 * 19. Question? - Is it better to use Entities for this? Define an entity which is
 * IMMUTABLE and then tell that Disc is that type of entity?
 */
export default function Disc({ collapsed, itemId, isCollapsible }: Props) {
  const { onZoom, onExpandClick, onCollapseClick } = React.useContext(
    EditorContext
  );

  return (
    <div className="relative flex items-center" style={{ marginTop: 2 }}>
      {isCollapsible && (
        <button
          className="absolute top-0 left-0 items-center justify-center hidden w-8 h-6 -ml-8 border-none opacity-0 cursor-pointer sm:flex transition-all duration-100 hover:opacity-100"
          style={{
            marginTop: -2,
          }}
          onClick={() => {
            if (collapsed) {
              if (typeof onExpandClick === 'function') {
                onExpandClick(itemId);
              }
            } else {
              if (typeof onCollapseClick === 'function') {
                onCollapseClick(itemId);
              }
            }
          }}
          data-testid="collapse-arrow"
        >
          <DownArrow
            className={classNames(
              'transition-transform duration-100 transform rotate-0 fill-current text-copy-primary',
              {
                '-rotate-90': collapsed,
              }
            )}
            width={8}
            height={8}
          />
        </button>
      )}
      <div
        contentEditable={false}
        className={classNames(
          'flex items-center justify-center w-5 h-5 rounded-full cursor-pointer hover:bg-background-tertiary',
          { 'bg-background-secondary': collapsed }
        )}
        onClick={() => {
          if (typeof onZoom === 'function') {
            onZoom(itemId);
          }
        }}
        data-testid="outer-disc"
      >
        <svg
          width="6"
          height="6"
          className="fill-current text-copy-secondary"
          viewBox="0 0 6 6"
        >
          <circle cx="3" cy="3" r="3" />
        </svg>
      </div>
    </div>
  );
}
