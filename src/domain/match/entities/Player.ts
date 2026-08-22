export interface Player {
  readonly id: string;
  readonly teamId: string;
  readonly number: number;
  readonly name?: string;
  readonly active?: boolean;
}
