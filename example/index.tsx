import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Editor from '../.';

// import '../src/tailwind_generated.css';
// import '../src/Editor/components/editor_styles.css';
// If i import the deepnotes-editor.css file directly from ../dist/, it
// doesn't apply any of the tailwind css. Don't know why.
import './deepnotes-editor.css';

const App = () => {
  return (
    <div className="theme-light" style={{ maxWidth: 800, margin: 'auto' }}>
      <Editor initialZoomedInItemId="root" />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
