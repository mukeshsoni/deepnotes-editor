`deepnotes-editor` is the editor used in [deepnotes.in](https://deepnotes.in).
It's a clone of the [workflowy.com](https://workflowy.com) editor written in
[draft-js](https://draftjs.org/). `deepnotes-editor` can be used as a react
component.

Here's a codesandbox demo link - https://codesandbox.io/s/deepnotes-editor-demo-t4gnm

Here's a gif of how it works - 

![deepnotes editor demo](deepnotes-editor-demo.gif)

Why `deepnotes-editor`?

- Supports infinitely nested lists
- Every list item can be zoomed into. Therefore every list item can be thought
  of as a document in itself
- Nested lists can be collapsed to reduce clutter
- Powerful keyboard shortcuts so that you don't have to remove your hands from
  the keyboard when navigating the documents
- Supports hashtags, automatic link detection and inline code block formatting
- Bookmarking of any list item

### Desktop only
`deepnotes-editor` doesn't work well on mobile browsers. That's because
`draft-js` itself does not work well on mobile browsers.

Usage -

Install `deepnoter-editor`

```shell
npm install deepnotes-editor # or yarn add deepnotes-editor
```

Use anywhere in your react codebase

```
import Editor from 'deepnotes-editor';

// it will look like it's not working without the css
import 'deepnotes-editor/dist/deepnotes-editor.css';

// inside your dom heirarchy somewhere
<div>
  <Editor onChange={editorState => saveToDb(editorState)} />
</div>
```

## How to save editor state?
You can use draft-js utilities to convert the `EditorState` returned from
`onChange` prop. The prop returned is an [immutable-js](https://immutable-js.github.io/immutable-js/) value.


```
import { convertToRaw } from 'draft-js'

function saveToDb(editorState) {
  const contentState = JSON.stringify(convertToRaw(contentState)),

  saveToDbOrLocalStorage(contentState);
}
```

## How to get back editor state from the saved content state?
You can use `convertFromRaw` utility from `draft-js` to convert the content
state json back to immutable-js `EditorState`. You have to use the
`createDecorators` function which comes with `deepnotes-editor` so that the
hashtags, links and code are highlighted properly.


```
import DeepnotesEditor, { createDecorators} from 'deepnotes-editor';
import 'deepnotes-editor/dist/deepnotes-editor.css';

const contentState = convertFromRaw(JSON.parse(backupContent));
const editorState = EditorState.createWithContent(
  contentState,
  createDecorators()
);

// inside your render function
return <div>
  <DeepnotesEditor
    initialEditorState={editorState}
    onChange={(changedEditorState) => saveToDb(changedEditorState)}}
  />
</div>
```

### Customization or configuration
These are the props `deepnotes-editor` accepts

#### initialEditorState
This prop can be used to initialize the editor with some saved state. The state
is of the type `EditorState` from `draft-js`. See `draft-js` documentation for
more details - https://draftjs.org/docs/quickstart-api-basics#controlling-rich-text

P. S. - This component is not a controlled component. The state of the editor is
maintained inside the component. If you change the zoomedInItemId, the editor
will zoom into that item. But changing the initialEditorState between renders
will not change the content of the editor to the new value of
initialEditorState.

#### initialZoomedInItemId
If we want the editor to open zoomed in on some item. Very useful if you map the
zoomedin items with urls and then if a user pastes or goes to a particular item
directly, the editor can be also zoomed in to that item.

#### searchText
If you want to filter the items by some text

#### onChange
`onChange` is a function which is called with the new `EditorState` on every
change. This can be used to save the new `EditorState` to local storage or to
some persistent database.

#### onRootChange
This prop is called if the user zooms into a particular item. Please checkout
workflowy.com to understand what zoom in means.

#### onBookmarkClick
If a user wants to bookmarks a particular zoomed in item. This can be used to
build a bookmarking feature where the user can zoom to any of the bookmarked
item.

### withToolbar
If you don't want the menu/toolbar which shows up above the editor, you can set
withToolbar to false.

## Development
Install dependencies and start the build for the Editor component

```bash
npm install # or yarn install
npm start # or yarn start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

This does not start a server. It only watches your files and builds and puts them in dist folder when any file in src directory changes. To view the editor in action, you need to ru na server inside the example directory.

Then run the example inside another:

```bash
cd example
npm i # or yarn to install dependencies
npm start # or yarn start
```

The example is served on http://localhost:1234. If that port is busy, parcel might try starting the server on some other port.

The default example imports and live reloads whatever is in `/dist`, so if you are seeing an out of date component, make sure TSDX is running in watch mode like we recommend above. **No symlinking required**, [we use Parcel's aliasing](https://github.com/palmerhq/tsdx/pull/88/files).

To do a one-off build, use `npm run build` or `yarn build`.

To run tests, use `npm test` or `yarn test`.

