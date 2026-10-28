import type { NavigationItem } from '../types';

function flattenData(root: readonly NavigationItem[]) {
  const data: NavigationItem[] = [];
  const flatten = (i: readonly NavigationItem[]) => {
    i.forEach((child) => {
      if (child.url.includes('#')) return;
      data.push(child);
      if (child.children) {
        flatten(child.children);
      }
    });
  };

  flatten(root);
  return data;
}

export default flattenData;
