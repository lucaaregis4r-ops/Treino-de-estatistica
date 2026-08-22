export type TokenType = 'TEAM' | 'PLAYER' | 'SKILL' | 'EVALUATION';

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly position: number;
}
