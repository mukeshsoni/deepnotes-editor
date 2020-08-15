import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Editor from '../.';

import '../src/tailwind_generated.css';
import '../src/Editor/components/editor_styles.css';

const App = () => {
  return (
    <div>
      <Editor />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
