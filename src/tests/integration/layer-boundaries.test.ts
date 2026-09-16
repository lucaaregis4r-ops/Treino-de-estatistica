import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith('.ts') || path.endsWith('.tsx')
        ? [path]
        : [];
  });
}

describe('architecture boundaries', () => {
  it('keeps domain independent from UI, infrastructure, and React', () => {
    const domainRoot = resolve('src/domain');
    const violations = sourceFiles(domainRoot).flatMap((file) => {
      const contents = readFileSync(file, 'utf8');
      return /(?:from|import\s*)\s*["'][^"']*(?:^|\/)(?:ui|infrastructure|react)(?:\/|$)[^"']*["']/.test(contents)
        ? [relative(domainRoot, file)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('keeps core independent from domain, UI, infrastructure, and React', () => {
    const coreRoot = resolve('src/core');
    const violations = sourceFiles(coreRoot).flatMap((file) => {
      const contents = readFileSync(file, 'utf8');
      return /(?:from|import\s*)\s*['"][^'"]*(?:domain|ui|infrastructure|react)[^'"]*['"]/.test(
        contents,
      )
        ? [relative(coreRoot, file)]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
