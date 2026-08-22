import type { CanonicalScoutEventCandidate } from '../../scout/mapper/CanonicalScoutEventCandidate';

export function trainingTacticalTokens(event: CanonicalScoutEventCandidate): readonly string[] {
  const tactical = event.metadata?.tactical;
  const trajectory =
    tactical?.serve?.trajectory ?? tactical?.attack?.trajectory ?? tactical?.trajectory;
  return [
    tactical?.serve?.serveType && `y${tactical.serve.serveType}`,
    trajectory?.origin?.zoneId && `o${trajectory.origin.zoneId}`,
    trajectory?.target?.zoneId && `t${trajectory.target.zoneId}`,
    tactical?.reception?.contactLocation?.zoneId && `o${tactical.reception.contactLocation.zoneId}`,
    tactical?.set?.setterCall && `l${tactical.set.setterCall}`,
    tactical?.set?.targetLocation?.zoneId && `t${tactical.set.targetLocation.zoneId}`,
    tactical?.attack?.combination && `c${tactical.attack.combination}`,
    tactical?.attack?.tempo && `q${tactical.attack.tempo}`,
    tactical?.attack?.blockersCount !== undefined && `b${tactical.attack.blockersCount}`,
    tactical?.block?.blockersCount !== undefined && `b${tactical.block.blockersCount}`,
  ].filter((value): value is string => Boolean(value));
}

export function formatTrainingCode(event: CanonicalScoutEventCandidate): string {
  const tokens = trainingTacticalTokens(event);
  return tokens.length > 0 ? `${event.normalizedCode} ${tokens.join(' ')}` : event.normalizedCode;
}

export function formatTrainingSequence(events: readonly CanonicalScoutEventCandidate[]): string {
  return events.map(formatTrainingCode).join(' ; ');
}

export function trainingInputHint(events: readonly CanonicalScoutEventCandidate[]): string {
  if (events.length > 1)
    return 'Separe os contatos com ; e acrescente os detalhes após cada código.';
  const skill = events[0]?.skill;
  if (skill === 'serve') return 'Código + tipo (yQ/yM/yH/yT) + destino (t).';
  if (skill === 'reception')
    return 'Código de recepção + zona de contato (o). A qualidade é o símbolo final.';
  if (skill === 'set') return 'Código + chamada do central (l) + zona de destino (t).';
  if (skill === 'attack')
    return 'Código + combinação (c) + origem (o) + destino (t) + tempo (q) + bloqueadores (b).';
  if (skill === 'block') return 'Código de bloqueio + número de bloqueadores (b).';
  if (skill === 'dig' || skill === 'free_ball')
    return 'Código + zona de contato (o) e, quando observada, destino (t).';
  return 'Digite jogador, fundamento e avaliação.';
}
