import * as React from 'react';
import classNames from 'classnames';
import { Menu, MenuList, MenuButton, MenuItem } from '@reach/menu-button';

import CheckMark from '../../icons/CheckMark';
import ArrowRight from '../../icons/ArrowRight';
import ArrowLeft from '../../icons/ArrowLeft';
import DotHorizontal from '../../icons/DotHorizontal';
import Star from '../../icons/Star';

import settingsStyles from '../../settings_styles.module.css';

interface Props {
  onExpandAllClick: () => void;
  onCollapseAllClick: () => void;
  onIndentClick: () => void;
  onOutdentClick: () => void;
  onToggleCompletionClick: () => void;
  isBookmarked: boolean;
  onBookmarkClick: () => void;
}

export default function MenuContainer({
  onExpandAllClick,
  onCollapseAllClick,
  onIndentClick,
  onOutdentClick,
  onToggleCompletionClick,
  isBookmarked,
  onBookmarkClick,
}: Props) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-end w-full px-4 py-2 mt-3 bg-background-primary transition-colors duration-300">
      <div className="flex items-center px-2 mr-6 text-gray-600 space-x-2">
        <button
          onMouseDown={e => {
            // tip: mousedown event occurs before onFocus and onClick. If we
            // stop the propagation event in mousedown, the onFocus and onClick
            // events are not triggered. This means the editor item never loses
            // focus. This helps prevent the on screen keyboard to not hide on
            // mobile devices
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            onToggleCompletionClick();
          }}
          aria-label="Mark complete"
          className="icon-button"
          title="Mark complete"
        >
          <CheckMark className="w-4 h-4" />
        </button>
        {'\u00A0'}
        <button
          onMouseDown={e => {
            // tip: mousedown event occurs before onFocus and onClick. If we
            // stop the propagation event in mousedown, the onFocus and onClick
            // events are not triggered. This means the editor item never loses
            // focus. This helps prevent the on screen keyboard to not hide on
            // mobile devices
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            onOutdentClick();
          }}
          aria-label="Outdent"
          className="icon-button"
          title="Outdent"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onMouseDown={e => {
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            onIndentClick();
          }}
          aria-label="Indent"
          className="icon-button"
          title="Indent"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center">
        <button
          className="mr-1 icon-button"
          onMouseDown={e => {
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            onBookmarkClick();
          }}
          aria-label="Bookmark item"
          title="Bookmark item"
          data-bookmarked={isBookmarked}
        >
          <Star
            className={classNames('w-5 h-5', {
              'fill-current text-pink-600': isBookmarked,
              'stroke-current': !isBookmarked,
            })}
          />
        </button>
        <Menu>
          {() => (
            <>
              <MenuButton>
                <button className="icon-button" aria-label="Show menu">
                  <DotHorizontal className="w-4 h-4 fill-current" />
                </button>
              </MenuButton>
              <MenuList className={settingsStyles['slide-down']}>
                <MenuItem onSelect={onExpandAllClick}>Expand all</MenuItem>
                <MenuItem onSelect={onCollapseAllClick}>Collapse all</MenuItem>
              </MenuList>
            </>
          )}
        </Menu>
      </div>
    </div>
  );
}
