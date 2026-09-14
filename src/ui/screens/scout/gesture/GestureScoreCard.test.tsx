import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GestureScoreCard } from './GestureScoreCard';

describe('GestureScoreCard', () => {
  it('renders teams, score and current set', () => {
    render(
      <GestureScoreCard
        homeName="Equipe A"
        awayName="Equipe B"
        homeScore={18}
        awayScore={17}
        setNumber={1}
      />,
    );
    expect(screen.getByText('18 × 17')).toBeInTheDocument();
    expect(screen.getByText('SET 1')).toBeInTheDocument();
  });
});
