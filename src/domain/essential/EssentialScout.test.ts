import { describe, expect, it } from 'vitest';
import { essentialThirdFromPosition, validateEssentialDraft, type EssentialScoutDraft } from './EssentialScout';

const base: EssentialScoutDraft = { code: 'PF', teamId: 'team-a' };

describe('Scout Essencial — qualificadores e terços', () => {
  it('preserva um terço declarado sem criar coordenada', () => {
    expect(validateEssentialDraft({ code: 'F', teamId: 'team-a', shirtNumber: 99, third: 'attacking', outcome: 'gol', qualifiers: ['first_touch', 'under_pressure'] })).toBeUndefined();
    expect(validateEssentialDraft({ ...base, third: 'middle', thirdAnchor: 'destination', qualifiers: ['through_ball', 'transition'] })).toBeUndefined();
    expect(validateEssentialDraft({ ...base, third: 'middle', position: { x: .5, y: .5 } })).toMatch(/Terço manual/);
    expect(validateEssentialDraft({ ...base, third: 'middle', destination: { x: .5, y: .5 } })).toMatch(/Terço manual/);
  });

  it('valida camisa, âncora e qualificadores por fundamento', () => {
    expect(validateEssentialDraft({ ...base, shirtNumber: 1000 })).toMatch(/Camisa/);
    expect(validateEssentialDraft({ ...base, shirtNumber: -1 })).toMatch(/Camisa/);
    expect(validateEssentialDraft({ ...base, shirtNumber: 0 })).toBeUndefined();
    expect(validateEssentialDraft({ ...base, thirdAnchor: 'destination' })).toMatch(/Âncora/);
    expect(validateEssentialDraft({ code: 'RP', teamId: 'team-a', third: 'defensive', thirdAnchor: 'destination' })).toMatch(/passe ou progressão/);
    expect(validateEssentialDraft({ ...base, qualifiers: ['cross', 'cross'] })).toMatch(/Qualificadores/);
    expect(validateEssentialDraft({ ...base, qualifiers: ['tackle'] })).toMatch(/Qualificadores/);
    expect(validateEssentialDraft({ code: 'F', teamId: 'team-a', outcome: 'gol' })).toMatch(/origem ou o terço/);
  });

  it('distingue resultados, tipo de progressão, reinício e falta sem inventar localização', () => {
    expect(validateEssentialDraft({ code: 'P', teamId: 'team-a', passResult: 'unknown', third: 'middle', qualifiers: ['pivot'] })).toBeUndefined();
    expect(validateEssentialDraft({ code: 'P', teamId: 'team-a' })).toMatch(/resultado do passe/);
    expect(validateEssentialDraft({ code: 'PF', teamId: 'team-a', passResult: 'incomplete' })).toMatch(/passe completo/);
    expect(validateEssentialDraft({ code: 'C', teamId: 'team-a', progressionType: 'dribble', progressionResult: 'lost', third: 'attacking' })).toBeUndefined();
    expect(validateEssentialDraft({ code: 'C', teamId: 'team-a', progressionType: 'carry' })).toMatch(/tipo e resultado/);
    expect(validateEssentialDraft({ code: 'FL', teamId: 'team-a', foulAccumulated: true, foulCard: 'yellow' })).toBeUndefined();
    expect(validateEssentialDraft({ code: 'RE', teamId: 'team-a', restartType: 'kick_in' })).toBeUndefined();
    expect(validateEssentialDraft({ code: 'RE', teamId: 'team-a' })).toMatch(/tipo de reinício/);
    expect(validateEssentialDraft({ code: 'RP', teamId: 'team-a', passResult: 'complete' })).toMatch(/só se aplica a P\/PF/);
  });

  it('deriva o terço relativo à direção de ataque, inclusive nos limites', () => {
    const point = (x: number) => ({ x, y: .5 });
    expect(essentialThirdFromPosition(point(.2), 'x120')).toBe('defensive');
    expect(essentialThirdFromPosition(point(1 / 3), 'x120')).toBe('middle');
    expect(essentialThirdFromPosition(point(2 / 3), 'x120')).toBe('attacking');
    expect(essentialThirdFromPosition(point(.2), 'x0')).toBe('attacking');
    expect(essentialThirdFromPosition(point(.8), 'x0')).toBe('defensive');
    expect(essentialThirdFromPosition(point(.5), 'x0')).toBe('middle');
    expect(essentialThirdFromPosition(point(.2), undefined)).toBeUndefined();
    expect(essentialThirdFromPosition({ x: 2, y: .5 }, 'x120')).toBeUndefined();
  });
});
