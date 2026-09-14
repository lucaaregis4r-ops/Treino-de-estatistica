import type { Skill } from '../../../domain/scout/entities/Skill';

export const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  serve: 'Saque',
  reception: 'Recepção',
  set: 'Levantamento',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  free_ball: 'Bola de graça',
};

export const EVALUATION_LABELS: Readonly<Partial<Record<Skill, Readonly<Record<string, string>>>>> = {
  serve: { '#': 'Ace', '+': 'Positivo', '!': 'Limita', '-': 'Sem pressão', '/': 'Muito negativo', '=': 'Erro' },
  reception: { '#': 'Perfeita', '+': 'Positiva', '!': 'Limitada', '-': 'Negativa', '/': 'Overpass', '=': 'Erro' },
  set: { '#': '0–1 bloqueador', '+': 'Jogável', '=': 'Erro' },
  attack: { '#': 'Ponto', '+': 'Positivo', '!': 'Coberto', '-': 'Defendido', '/': 'Abafado pelo bloqueio', '=': 'Erro' },
  block: { '#': 'Ponto', '+': 'Positivo', '!': 'Cobertura', '-': 'Sem efeito', '/': 'Violação', '=': 'Erro' },
  dig: { '#': 'Perfeita', '+': 'Positiva', '!': 'Limitada', '-': 'Devolvida', '/': 'Muito negativa', '=': 'Erro' },
  free_ball: { '#': 'Alvo perfeito', '+': 'Controlada', '!': 'Neutra', '-': 'Fácil', '/': 'Muito negativa', '=': 'Erro' },
};

const GENERIC_EVALUATION_LABELS: Readonly<Record<string, string>> = {
  excellent: 'Excelente',
  positive: 'Positiva',
  neutral: 'Neutra',
  negative: 'Negativa',
  poor: 'Negativa',
  error: 'Erro',
};

export function evaluationLabel(skill: Skill, value: string): string {
  return EVALUATION_LABELS[skill]?.[value] ?? GENERIC_EVALUATION_LABELS[value] ?? value;
}
