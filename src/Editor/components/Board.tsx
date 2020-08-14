import * as React from 'react';
import { EditorState, BlockMap } from 'draft-js';
import pluckGoodies from '../pluck_goodies';
import { getChildren } from '../tree_utils';

interface Props {
  editorState: EditorState;
  zoomedInItemId: string;
}

interface ColumnProps {
  blockMap: BlockMap;
  columnKey: string;
}

function Column(props: ColumnProps) {
  const { blockMap, columnKey } = props;
  const column = blockMap.get(columnKey);
  const columnItems = getChildren(blockMap, columnKey);

  return (
    <div
      className="flex flex-col flex-1 mt-3 mr-3 p-3 border border-gray-300 rounded-md"
      style={{ minWidth: 250 }}
      key={column.getKey()}
    >
      <h3 className="text-center font-bold mb-3">{column.getText()}</h3>
      <div className="flex flex-col">
        {columnItems.toArray().map(columnItem => {
          return (
            <div
              className="p-2 rounded-sm mb-3 bg-gray-200 text-gray-700"
              key={columnItem.getKey()}
            >
              <textarea
                defaultValue={columnItem.getText()}
                className="rounded-sm outline-none bg-gray-200 resize-none"
              />
            </div>
          );
        })}
        <button className="bg-pink-200 hover:bg-gray-700 hover:text-gray-200 py-1 rounded-md">
          Add new item
        </button>
      </div>
    </div>
  );
}

export default function Board(props: Props) {
  const { editorState, zoomedInItemId } = props;
  const { blockMap } = pluckGoodies(editorState);

  const boardBlock = blockMap.get(zoomedInItemId);
  const columns = getChildren(blockMap, zoomedInItemId);

  return (
    <div className="overflow-auto">
      <h2 className="font-bold text-2xl">{boardBlock.getText()}</h2>
      <div className="flex ">
        {columns.toArray().map(column => {
          if (column) {
            console.log('c', column.getText());
            return <Column blockMap={blockMap} columnKey={column.getKey()} />;
          } else {
            return <div>column not found</div>;
          }
        })}
      </div>
    </div>
  );
}
