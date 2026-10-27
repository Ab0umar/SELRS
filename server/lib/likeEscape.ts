/** Makes the characters LIKE treats as wildcards (% _) and its escape character (\) literal. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** `%term%` with the user's own wildcards neutralised. */
export function likeContains(term: string): string {
  return `%${escapeLike(term)}%`;
}
