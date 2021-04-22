import * as React from 'react';
import classNames from 'classnames';
import { ContentBlock, EditorBlock } from 'draft-js';
import Disc from './Disc';
import PlusSign from '../../icons/PlusSign';
import MinusSign from '../../icons/MinusSign';

import styles from './item_styles.module.css';

interface Props {
  block: ContentBlock;
  blockProps: {
    zoomedInItemId: string;
    baseDepth: number;
    searchText?: string;
    hidden: boolean;
    onExpandClick: (blockKey: string) => void;
    onCollapseClick: (blockKey: string) => void;
  };
}

/**
 * Hacky but works
 * We wrap the item in nested divs each with class depth-manager mainly to get
 * the vertical line which connects the various item bullet dot together.
 * If we simply adding a margin-left of (depth * someMargin) on the item div
 * itself, we would not be able to show that vertical line by simply adding
 * a left-border and. The left border trick works only by creating the left
 * space in each depth-manager using a padding. It won't work with a margin-left
 */
function wrapInNestedDivs(
  el: React.ReactElement,
  props: any,
  depth: number
): React.ReactElement {
  if (depth <= 0) {
    return el;
  }

  return React.createElement(
    'div',
    props,
    wrapInNestedDivs(el, props, depth - 1)
  );
}

function areEqual(prevProps: Props, newProps: Props) {
  const {
    block: prevBlock,
    blockProps: {
      hidden: prevHidden,
      baseDepth: prevBaseDepth,
      searchText: prevSearchText,
    },
  } = prevProps;
  const {
    block: nextBlock,
    blockProps: {
      hidden: nextHidden,
      baseDepth: nextBaseDepth,
      searchText: nextSearchText,
    },
  } = newProps;

  return (
    prevBlock === nextBlock &&
    prevHidden === nextHidden &&
    prevBaseDepth === nextBaseDepth &&
    prevSearchText === nextSearchText
  );
}

export const Item = React.memo((props: Props) => {
  const { block, blockProps } = props;
  const {
    onExpandClick,
    onCollapseClick,
    hidden,
    baseDepth,
    zoomedInItemId,
  } = blockProps;

  const collapsed = block.getIn(['data', 'collapsed']);
  const completed = block.getIn(['data', 'completed']);
  const collapsible = block.getIn(['data', 'hasChildren']);

  /*
   * 7. When i try rendering the block on my own by wrapping the list item
   * EditorBlock inside my own html, it puts the whole div inside the rendered
   * li! So i 1. wrote css to hide the bullet for the li(s). 2. Render a small
   * circle like bullet of my own before the EditorBlock renders the text.
   *
   * Now i can control the various looks of the bullet based on
   * 1. Whether they are collapsed or not
   * 2. Whether user has marked it complete or not
   * 3. And i can add the arrow before the bullet to allow users to collapse or
   * expand a list item
   */

  if (hidden) {
    return null;
  }

  const depth = block.getDepth();
  // most of the conditional classes are for the zoomed in item. It's special.
  const itemClasses = classNames(styles['item-base'], {
    [styles.completed]: completed,
    [styles['regular-item']]: zoomedInItemId !== block.getKey(),
    [styles['zoomed-in-item']]: zoomedInItemId === block.getKey(),
    [styles['small-text']]:
      zoomedInItemId !== block.getKey() && depth > baseDepth + 1,
  });

  return wrapInNestedDivs(
    <div
      className={itemClasses}
      style={{
        marginLeft: -13,
        // can't use tailwind classes for this since it has to increase linearly
        // and tailwind values don't increase linearly
        // we have to use this marginLeft if we don't use wrapInNestedDivs
        // marginLeft: `${Math.max(0, 2 * (depth - baseDepth - 1))}rem`,
      }}
      data-testid="list-item"
    >
      {block.getDepth() > baseDepth && (
        <Disc
          itemId={block.getKey()}
          collapsed={!!collapsed}
          isCollapsible={collapsible}
        />
      )}
      {/* I had to add display: 'block' to get the edit cursor to work on empty list item. 
		Otherwise, the edit cursor was not visible on empty item. It would come after typing one 
		charater */}
      <div className={styles['item-container']}>
        <EditorBlock {...props} />
        {collapsible ? (
          !collapsed ? (
            <button
              contentEditable={false}
              className={styles['mobile-collapse-button']}
              onMouseDown={e => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onCollapseClick(block.getKey());
              }}
              data-testid="collapse-button"
            >
              <MinusSign width={16} height={16} />
            </button>
          ) : (
            <button
              contentEditable={false}
              className={styles['mobile-collapse-button']}
              onMouseDown={e => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onExpandClick(block.getKey());
              }}
              data-testid="expand-button"
            >
              <PlusSign width={16} height={16} />
            </button>
          )
        ) : null}
      </div>
    </div>,
    {
      className: classNames('depth-manager', styles['depth-manager']),
    },
    depth - baseDepth - 1
  );
}, areEqual);

Item.displayName = 'Item';
