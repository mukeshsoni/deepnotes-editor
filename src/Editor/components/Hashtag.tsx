import * as React from 'react';

interface Props {
  children: Array<React.ReactElement>;
  handleSearchInputChange?: (searchText: string) => void;
}

function Hashtag({ children, handleSearchInputChange }: Props) {
  return (
    <button
      style={{
        textDecoration: 'underline',
        color: 'rgb(134, 140, 144)',
        cursor: 'pointer',
      }}
      onClick={() => {
        if (
          children[0] &&
          children[0].props &&
          children[0].props.text &&
          handleSearchInputChange
        ) {
          handleSearchInputChange(children[0].props.text);
        }
      }}
      data-testid="hashtag"
    >
      {children}
    </button>
  );
}

export default React.memo(Hashtag);
