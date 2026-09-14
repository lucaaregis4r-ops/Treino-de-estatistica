import type { PlayerRole } from '../roles/PlayerRole';

export interface Player {
  readonly id: string;
  readonly teamId: string;
  readonly number: number;
  readonly name?: string;
  readonly active?: boolean;
  /** Função cadastrada do atleta; não muda com sua posição na rotação. */
  readonly registeredRole?: PlayerRole;
}
