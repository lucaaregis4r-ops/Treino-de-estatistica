import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, success, type Result } from '../../../core/result/Result';
import type { DirectoryExportPort } from '../../../application/ports/export/DirectoryExportPort';
import type { MatchExportBundle } from '../../../application/ScoutTrainerService';

interface WritableFileHandle {
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface WritableDirectoryHandle {
  readonly name: string;
  getDirectoryHandle(name: string, options: { create: true }): Promise<WritableDirectoryHandle>;
  getFileHandle(name: string, options: { create: true }): Promise<WritableFileHandle>;
}

type DirectoryPicker = (options: {
  id: string;
  mode: 'readwrite';
  startIn: 'documents';
}) => Promise<WritableDirectoryHandle>;

export class BrowserDirectoryExporter implements DirectoryExportPort {
  private directory?: WritableDirectoryHandle;

  constructor(private readonly windowObject: Window = window) {}

  get supported(): boolean {
    return 'showDirectoryPicker' in this.windowObject;
  }

  get connectedDirectoryName(): string | undefined {
    return this.directory?.name;
  }

  async connect(): Promise<Result<string, RepositoryError>> {
    const picker = (this.windowObject as Window & { showDirectoryPicker?: DirectoryPicker })
      .showDirectoryPicker;
    if (!picker) {
      return failure(
        new RepositoryError(
          'database_operation_failed',
          'Este navegador não permite conectar uma pasta. Use os downloads individuais.',
        ),
      );
    }
    try {
      this.directory = await picker.call(this.windowObject, {
        id: 'scout-trainer-exports',
        mode: 'readwrite',
        startIn: 'documents',
      });
      return success(this.directory.name);
    } catch (error) {
      return failure(
        new RepositoryError(
          'database_operation_failed',
          error instanceof DOMException && error.name === 'AbortError'
            ? 'A seleção da pasta foi cancelada.'
            : 'Não foi possível conectar a pasta escolhida.',
          error,
        ),
      );
    }
  }

  async write(bundle: MatchExportBundle): Promise<Result<string, RepositoryError>> {
    if (!this.directory) {
      return failure(
        new RepositoryError('database_operation_failed', 'Escolha uma pasta antes de exportar.'),
      );
    }
    try {
      const destination = await this.directory.getDirectoryHandle(bundle.folderName, {
        create: true,
      });
      for (const [name, contents] of Object.entries(bundle.files)) {
        const file = await destination.getFileHandle(name, { create: true });
        const writable = await file.createWritable();
        await writable.write(contents);
        await writable.close();
      }
      return success(`${this.directory.name}/${bundle.folderName}`);
    } catch (error) {
      return failure(
        new RepositoryError(
          'database_operation_failed',
          'Não foi possível gravar o pacote na pasta conectada.',
          error,
        ),
      );
    }
  }

  disconnect(): void {
    this.directory = undefined;
  }
}
