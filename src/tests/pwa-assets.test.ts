// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';

describe('PWA assets', () => {
  it('defines a standalone manifest and offline service worker', () => {
    const manifest = JSON.parse(readFileSync(resolve('public/manifest.webmanifest'), 'utf8')) as {
      name: string;
      display: string;
      start_url: string;
      icons: unknown[];
    };
    const worker = readFileSync(resolve('public/sw.js'), 'utf8');
    expect(manifest).toMatchObject({
      name: 'Scout Trainer',
      display: 'standalone',
      start_url: './',
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
      ]),
    );
    expect(worker).toContain("self.addEventListener('fetch'");
    expect(worker).toContain("caches.match('./index.html')");
    expect(worker).toContain('matchAll');
  });

  it('precaches discovered build assets and serves the app shell when navigation is offline', async () => {
    const source = readFileSync(resolve('public/sw.js'), 'utf8');
    const listeners = new Map<string, (event: Record<string, unknown>) => void>();
    const entries = new Map<string, Response>();
    const cache = {
      addAll: (urls: string[]) => {
        urls.forEach((url) => entries.set(url, new Response('asset')));
        return Promise.resolve();
      },
      put: (key: string, response: Response) => {
        entries.set(key, response);
        return Promise.resolve();
      },
    };
    const context = {
      URL,
      Response,
      Set,
      Promise,
      caches: {
        open: () => Promise.resolve(cache),
        keys: () => Promise.resolve(['scout-trainer-v1']),
        delete: () => Promise.resolve(true),
        match: (key: string) => Promise.resolve(entries.get(key)),
      },
      fetch: () =>
        Promise.resolve(
          new Response('<link href="/assets/app.css"><script src="/assets/app.js"></script>', {
            headers: { 'Content-Type': 'text/html' },
          }),
        ),
      self: {
        location: { origin: 'https://app.test' },
        registration: { scope: 'https://app.test/' },
        clients: { claim: () => undefined },
        skipWaiting: () => undefined,
        addEventListener: (type: string, listener: (event: Record<string, unknown>) => void) =>
          listeners.set(type, listener),
      },
    };
    runInNewContext(source, context);
    let installWork: Promise<unknown> | undefined;
    listeners.get('install')?.({
      waitUntil: (work: Promise<unknown>) => {
        installWork = work;
      },
    });
    await installWork;
    expect(entries.has('https://app.test/assets/app.js')).toBe(true);
    expect(entries.has('https://app.test/assets/app.css')).toBe(true);

    context.fetch = () => Promise.reject(new Error('offline'));
    let navigation: Promise<Response | undefined> | undefined;
    listeners.get('fetch')?.({
      request: { method: 'GET', url: 'https://app.test/', mode: 'navigate' },
      respondWith: (work: Promise<Response | undefined>) => {
        navigation = work;
      },
    });
    expect(await (await navigation)?.text()).toContain('/assets/app.js');
  });
});
