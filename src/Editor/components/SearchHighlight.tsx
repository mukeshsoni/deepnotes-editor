import * as React from 'react';

interface Props {
  children: React.ReactNode | React.ReactNodeArray;
}

export default function SearchHighlight(props: Props) {
  return (
    <span style={{ background: 'rgb(255,230,153)' }}>{props.children}</span>
  );
}
