import * as React from 'react';

export interface EditorDispatchContextProps {
  onZoom: (key: string) => void;
  onExpandClick: (key: string) => void;
  onCollapseClick: (key: string) => void;
}

/**
 * We will only put the dispatch function in this context
 * The dispatch value from useReducer never changes after it's first created
 * Which means the components which access the dispatch functions from this context
 * will never uncessarily rerender on other state changes not related to them
 */
export const EditorContext = React.createContext<
  Partial<EditorDispatchContextProps>
>({});
