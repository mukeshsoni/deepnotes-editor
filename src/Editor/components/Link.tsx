import * as React from 'react';

import styles from './link_styles.module.css';

interface Props {
  children: Array<React.ReactElement>;
}

export default function Link(props: Props) {
  const link = React.Children.map(props.children, (child: React.ReactElement) =>
    child && child.props ? child.props.text : ''
  ).join('');

  return (
    <a
      href={link}
      onClick={() => window.open(link, '_blank')}
      className={styles.link}
    >
      {props.children}
    </a>
  );
}
