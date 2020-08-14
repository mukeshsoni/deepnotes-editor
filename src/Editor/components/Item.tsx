import * as React from 'react';
import classNames from 'classnames';
import { ContentBlock, EditorBlock } from 'draft-js';
import Disc from './Disc';
import { ReactComponent as PlusSign } from '../../icons/plus-sign.svg';
import { ReactComponent as MinusSign } from '../../icons/minus-sign.svg';

interface Props {
  block: ContentBlock;
  blockProps: {
    zoomedInItemId: string;
    baseDepth: number;
    searchText?: string;
    hidden: boolean;
    collapsible: boolean;
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
      collapsible: prevCollapsible,
      baseDepth: prevBaseDepth,
      searchText: prevSearchText,
    },
  } = prevProps;
  const {
    block: nextBlock,
    blockProps: {
      hidden: nextHidden,
      collapsible: nextCollapsible,
      baseDepth: nextBaseDepth,
      searchText: nextSearchText,
    },
  } = newProps;

  return (
    prevBlock === nextBlock &&
    prevHidden === nextHidden &&
    prevCollapsible === nextCollapsible &&
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
    collapsible,
    baseDepth,
    zoomedInItemId,
  } = blockProps;

  const collapsed = block.getIn(['data', 'collapsed']);
  const completed = block.getIn(['data', 'completed']);

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
  const itemClasses = classNames('flex items-start relative', {
    'text-gray-500 line-through': completed,
    'p-1': zoomedInItemId !== block.getKey(),
    'pl-1': zoomedInItemId === block.getKey(),
    'mb-2': zoomedInItemId === block.getKey(),
    'font-bold': zoomedInItemId === block.getKey(),
    'text-2xl': zoomedInItemId === block.getKey(),
    'text-sm': zoomedInItemId !== block.getKey() && depth > baseDepth + 1,
    'text-base': zoomedInItemId !== block.getKey() && depth === baseDepth + 1,
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
      <div className="flex items-center justify-between w-full ml-3">
        <EditorBlock {...props} />
        {collapsible ? (
          !collapsed ? (
            <button
              contentEditable={false}
              className="flex items-center justify-center ml-3 sm:hidden"
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
              className="flex items-center justify-center ml-3 sm:hidden"
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
      className:
        'depth-manager pl-8 border-l border-background-secondary border-opacity-50 w-full',
    },
    depth - baseDepth - 1
  );
}, areEqual);

Item.displayName = 'Item';
