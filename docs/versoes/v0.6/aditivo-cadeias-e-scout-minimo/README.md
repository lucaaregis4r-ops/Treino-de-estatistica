# Aditivo 0.6 — sequências completas e scout mínimo de futsal

**Estado:** S0–S4 implementadas; S5 pendente. Este aditivo amplia a linha 0.6 ainda em validação, sem renumerar as etapas M0–M8. Consulte o [estado da versão](../ESTADO.md).

## Objetivo

Analisar o **rally inteiro** no vôlei e **cada posse observada inteira** no futebol e no futsal, qualquer que seja a quantidade de ações registradas. Fazer o scout do futsal caber num fluxo de jogo: relógio e placar, quadra, controle da bola e faixa inferior de ações. Nenhum detalhe tático ou atleta será obrigatório para marcar a posição da bola.

## Leitura e execução para o Luna

1. [Plano mestre](PLANO_IMPLEMENTACAO_LUNA.md): decisões, ordem e contratos.
2. [Referências e limites](REFERENCIAS_E_DECISOES.md): estudos e o que os dados locais permitem afirmar.
3. Arquivo da etapa solicitada. Executar **uma etapa por solicitação**; registrar arquivos, comportamento, testes e pendências ao terminá-la.

| Etapa | Entrega |
|---|---|
| [S0 — contratos e protótipo](etapas/S0_CONTRATOS_E_PROTOTIPO.md) | Semântica de rally/posse, cobertura, métrica e esboço operacional |
| [S1 — scout mínimo de futsal](etapas/S1_SCOUT_MINIMO_FUTSAL.md) | Quadra/tempo/controle visíveis e ações em faixa inferior |
| [S2 — trajetórias completas](etapas/S2_TRAJETORIAS_COMPLETAS.md) | Projeção íntegra e auditável nos três esportes |
| [S3 — análises e apresentação](etapas/S3_ANALISES_DESCRITIVAS.md) | Resultados por trajetória, variantes e filtros sem corte em 2/3 passos |
| [S4 — Markov com contexto](etapas/S4_MODELO_PROBABILISTICO.md) | Modelo por modalidade, recuo variável e validação por partida |
| [S5 — validação e entrega](etapas/S5_VALIDACAO.md) | Regressão, inspeção operacional e documentação |

Este plano é adicional ao [roteiro original da 0.6](../README.md). Não altera por si só o app, o banco, o backup ou o número de versão.

Entregáveis da S0: [contratos](S0_CONTRATOS.md), [fixtures](S0_FIXTURES.md) e [protótipo](S0_PROTOTIPO.md). Por solicitação expressa, esta etapa também implementou atalhos, captura espacial por tipo de ação, desarme com troca automática de posse e orientação visual fixa por período.

Entrega da S1: [resultado e verificações](S1_RESULTADO.md).

Entrega da S2: [projeções, cobertura e verificações](S2_RESULTADO.md).

Entrega da S3: [análises, exportações e contraste](S3_RESULTADO.md).

Entrega da S4: [modelo de contexto variável](S4_RESULTADO.md). A próxima etapa do aditivo é **S5 — validação e entrega**.
