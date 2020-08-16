import * as React from 'react';
import classNames from 'classnames';
import { Menu, MenuList, MenuButton, MenuItem } from '@reach/menu-button';

import CheckMark from '../../icons/CheckMark';
import ArrowRight from '../../icons/ArrowRight';
import ArrowLeft from '../../icons/ArrowLeft';
import DotHorizontal from '../../icons/DotHorizontal';
import Star from '../../icons/Star';

import styles from './menu_styles.module.css';
import buttonStyles from '../../button_styles.module.css';
import '@reach/menu-button/styles.css';

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
    <div className={styles['menu-container']}>
      <div className={styles['menu-left-container']}>
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
          className={classNames(
            buttonStyles['icon-button'],
            buttonStyles['button']
          )}
          title="Mark complete"
        >
          <CheckMark className={styles['menu-icon']} />
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
          className={classNames(
            buttonStyles['icon-button'],
            buttonStyles['button']
          )}
          title="Outdent"
        >
          <ArrowLeft className={styles['menu-icon']} />
        </button>
        <button
          onMouseDown={e => {
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            onIndentClick();
          }}
          aria-label="Indent"
          className={classNames(
            buttonStyles['icon-button'],
            buttonStyles['button']
          )}
          title="Indent"
        >
          <ArrowRight className={styles['menu-icon']} />
        </button>
      </div>
      <div className={styles['menu-right-container']}>
        <button
          className={classNames(
            buttonStyles['icon-button'],
            buttonStyles['button']
          )}
          style={{ marginRight: '1rem' }}
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
            className={classNames(styles['menu-icon-large'], {
              [styles.bookmarked]: isBookmarked,
              [styles['not-bookmarked']]: !isBookmarked,
            })}
          />
        </button>
        <Menu>
          {() => (
            <>
              <MenuButton>
                <button
                  className={classNames(
                    buttonStyles['icon-button'],
                    buttonStyles['button']
                  )}
                  aria-label="Show menu"
                >
                  <DotHorizontal className={styles['menu-icon']} />
                </button>
              </MenuButton>
              <MenuList className={styles['slide-down']}>
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
