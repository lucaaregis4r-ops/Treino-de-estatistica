export interface FreeLogEntry {
  readonly id: string;
  readonly sequence: number;
  readonly value: string;
  readonly createdAt: number;
}

export interface FreeLogSession {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly entries: readonly FreeLogEntry[];
}
