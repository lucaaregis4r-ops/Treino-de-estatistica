export function shouldCommitGestureKey(
  key: string,
  repeat: boolean,
  committing: boolean,
): boolean {
  return key === 'Enter' && !repeat && !committing;
}
