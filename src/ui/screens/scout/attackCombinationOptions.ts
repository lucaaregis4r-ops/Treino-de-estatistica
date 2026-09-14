export const ATTACK_COMBINATION_OPTIONS = Object.freeze([
  Object.freeze({ code: 'INV', description: 'Inversão — ataque pela faixa oposta ao padrão' }),
  Object.freeze({ code: 'CRZ', description: 'Cruzamento — atacantes cruzam suas trajetórias' }),
  Object.freeze({ code: 'PIPE', description: 'Pipe — ataque do fundo pelo centro, na zona 6' }),
  Object.freeze({ code: 'F2', description: 'Fundo 2 — ataque de trás pela zona 2' }),
  Object.freeze({ code: 'F4', description: 'Fundo 4 — ataque de trás pela zona 4' }),
]);

export const ATTACK_COMBINATION_EXAMPLES = ATTACK_COMBINATION_OPTIONS.map(
  ({ code, description }) => `C${code} ${description}`,
).join(' · ');
