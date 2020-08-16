import { RawDraftContentBlock } from 'draft-js';

function byStringPath(path: string, obj: any): any {
  const pathParts = path.split('.');

  return pathParts.reduce(
    (acc, pathPart) => (acc ? acc[pathPart] : undefined),
    obj
  );
}

export function arrToObj<T extends { [key: string]: any }>(
  arr: Array<T>,
  key: string
): { [key: string]: T } {
  return arr.reduce((acc, item) => {
    const k = item[key];

    if (typeof k === 'string') {
      return { ...acc, [k]: item };
    } else {
      return acc;
    }
  }, {});
}

interface Rows {
  [key: string]: RawDraftContentBlock;
}

function sortByPos(arr: Array<RawDraftContentBlock>) {
  const newArr = [...arr];

  newArr.sort((item1, item2) => {
    // @ts-ignore
    return item1.data.pos - item2.data.pos;
  });

  return newArr;
}

export default class DB {
  rows: Rows;

  constructor(rows: Rows) {
    this.rows = rows;
  }

  get(rowKey: string) {
    return this.rows[rowKey];
  }

  findAll(options: { where?: { [key: string]: string } }) {
    const where = options.where;

    return sortByPos(
      Object.entries(this.rows)
        // eslint-disable-next-line
        .filter(([_, row]) => {
          if (where) {
            return Object.entries(where).every(([path, val]) => {
              return byStringPath(path, row) === val;
            });
          } else {
            return true;
          }
        })
        // eslint-disable-next-line
        .map(([_, row]) => row)
    );
  }
}
