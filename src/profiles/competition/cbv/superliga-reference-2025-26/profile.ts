import type { CompetitionProfile } from '../../../types';

export const cbvSuperligaReference2025_26 = Object.freeze({
  kind: 'competition',
  id: 'cbv_superliga_reference_2025_26',
  version: '1.0.0',
  name: 'CBV Superliga Reference 2025/26',
  effectiveDate: '2025-10-01',
  sourceDescription: 'Referência versionada das definições estatísticas publicadas pela CBV.',
  sourceReferences: Object.freeze([
    'https://cbv.com.br/volei-de-quadra/superliga-a-masculina/estatisticas',
    'https://cbv.com.br/volei-de-quadra/superliga-a-masculina/estatisticas/ataque-mais-eficiente',
    'https://cbv.com.br/volei-de-quadra/superliga-a-masculina/estatisticas/saque-mais-eficiente',
    'https://cbv.com.br/volei-de-quadra/superliga-a-feminina/estatisticas/passe-mais-eficiente',
    'https://cbv.com.br/volei-de-quadra/superliga-a-feminina/estatisticas/bloqueio-mais-eficiente',
  ]),
  requiredFields: Object.freeze(['team', 'player', 'skill', 'evaluation', 'set']),
  metricIds: Object.freeze([
    'cbv.2025_26.attack',
    'cbv.2025_26.attack_efficiency',
    'cbv.2025_26.serve',
    'cbv.2025_26.serve_efficiency',
    'cbv.2025_26.block',
    'cbv.2025_26.block_efficiency',
    'cbv.2025_26.pass_efficiency',
    'cbv.2025_26.top_scorer',
  ]),
} satisfies CompetitionProfile);
