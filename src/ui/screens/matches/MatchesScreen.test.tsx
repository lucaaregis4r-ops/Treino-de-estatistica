import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import { MatchesScreen } from './MatchesScreen';

const matches: readonly MatchMetadata[] = [
  {
    id: 'created',
    name: 'Treino Regional',
    teamAId: 'a',
    teamBId: 'b',
    createdAt: 1,
    status: 'created',
    codeProfileId: 'default',
    codeProfileVersion: '1',
    complexityProfileId: 'basic',
  },
  {
    id: 'finished',
    name: 'Semifinal',
    teamAId: 'a',
    teamBId: 'b',
    createdAt: 3,
    status: 'finished',
    codeProfileId: 'default',
    codeProfileVersion: '1',
    complexityProfileId: 'tactical',
  },
  {
    id: 'active',
    name: 'Final São Paulo',
    teamAId: 'a',
    teamBId: 'b',
    createdAt: 2,
    status: 'in_progress',
    codeProfileId: 'default',
    codeProfileVersion: '1',
    complexityProfileId: 'unknown_profile',
  },
];

describe('MatchesScreen', () => {
  it('normalizes search, filters status, and opens the selected match id', () => {
    const onOpenMatch = vi.fn().mockResolvedValue(undefined);
    render(<MatchesScreen matches={matches} busy={false} onNewMatch={vi.fn()} onOpenMatch={onOpenMatch} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Final São Paulo' })).toBeInTheDocument();
    expect(screen.getByText('Perfil não traduzido (unknown_profile)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar por nome'), {
      target: { value: 'sao paulo' },
    });
    expect(screen.getByRole('button', { name: 'Final São Paulo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Semifinal' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar por nome'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'finished' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resumo' }));

    expect(onOpenMatch).toHaveBeenCalledWith('finished', true);
  });
});
