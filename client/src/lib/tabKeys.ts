import type { KeyboardEvent } from "react";

/** Arrow-key navigation for a tablist; the layout is RTL, so ArrowLeft is next. */
export function handleTabListKeys<T extends string>(
  event: KeyboardEvent<HTMLElement>,
  keys: readonly T[],
  current: T,
  select: (key: T) => void,
  tabId: (key: T) => string,
) {
  const index = keys.indexOf(current);
  if (index < 0) return;
  let next = index;
  if (event.key === "ArrowLeft") next = (index + 1) % keys.length;
  else if (event.key === "ArrowRight") next = (index - 1 + keys.length) % keys.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = keys.length - 1;
  else return;
  event.preventDefault();
  select(keys[next]);
  window.setTimeout(() => document.getElementById(tabId(keys[next]))?.focus(), 0);
}
