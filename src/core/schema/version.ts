const SEMANTIC_VERSION_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export type ProfileVersion = string;

export function isProfileVersion(value: string): boolean {
  return SEMANTIC_VERSION_PATTERN.test(value);
}
