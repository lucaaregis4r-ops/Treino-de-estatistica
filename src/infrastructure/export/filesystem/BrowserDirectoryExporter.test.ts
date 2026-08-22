import { describe, expect, it } from 'vitest';
import { BrowserDirectoryExporter } from './BrowserDirectoryExporter';

describe('BrowserDirectoryExporter', () => {
  it('creates one subdirectory and writes every file in the bundle', async () => {
    const written = new Map<string, string>();
    const destination = {
      name: 'export',
      getDirectoryHandle() {
        return Promise.resolve(destination);
      },
      getFileHandle(name: string) {
        return Promise.resolve({
          createWritable() {
            return Promise.resolve({
              write(value: string) {
                written.set(name, value);
                return Promise.resolve();
              },
              close: () => Promise.resolve(),
            });
          },
        });
      },
    };
    const fakeWindow = {
      showDirectoryPicker() {
        return Promise.resolve({ ...destination, name: 'Google Drive' });
      },
    } as unknown as Window;
    const exporter = new BrowserDirectoryExporter(fakeWindow);

    expect((await exporter.connect()).ok).toBe(true);
    const result = await exporter.write({
      folderName: 'A-x-B_2026-08-10',
      files: { 'partida.json': '{}', 'scouts.csv': 'header' },
    });

    expect(result).toMatchObject({ ok: true, value: 'Google Drive/A-x-B_2026-08-10' });
    expect(Object.fromEntries(written)).toEqual({ 'partida.json': '{}', 'scouts.csv': 'header' });
  });
});
