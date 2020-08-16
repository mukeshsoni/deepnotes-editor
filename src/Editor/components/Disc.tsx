import * as React from 'react';
import classNames from 'classnames';

import { EditorContext } from './EditorDispatchContext';
import DownArrow from '../../icons/DownArrow';

import styles from './disc_styles.module.css';

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
    <div className={styles['disc-container']} style={{ marginTop: 2 }}>
      {isCollapsible && (
        <button
          className={styles['collapse-button']}
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
            className={classNames(styles['down-arrow-icon'], {
              [styles['collapsed-down-arrow-icon']]: collapsed,
            })}
            width={8}
            height={8}
          />
        </button>
      )}
      <div
        contentEditable={false}
        className={classNames(styles['disc'], {
          [styles['disc-collapsed']]: collapsed,
        })}
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
          className={styles['disc-icon']}
          viewBox="0 0 6 6"
        >
          <circle cx="3" cy="3" r="3" />
        </svg>
      </div>
    </div>
  );
}
