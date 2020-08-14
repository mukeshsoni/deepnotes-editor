import * as React from 'react';

import { AppContext } from '../../AppContext';

interface Props {
  children: Array<React.ReactElement>;
}

function Hashtag({ children }: Props) {
  const { handleSearchInputChange } = React.useContext(AppContext);

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
