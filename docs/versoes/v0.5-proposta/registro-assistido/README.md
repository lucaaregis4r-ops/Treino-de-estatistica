# Registro assistido — ajudar o scouter

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Data:** 22/09/2026. **Estado:** planejamento, sem implementação. **Origem:** tela minimalista e detalhes opcionais aprovados pelo usuário; novo pedido de pressão fixável e destaque de trechos relevantes.

## Direção

O scouter acompanha o jogo. O sistema guarda o que ele observou, oferece atalhos para o que ele escolheu coletar e sugere poucos trechos para completar quando houver tempo. O registro de posição, troca e finalização continua funcionando sozinho.

Esta pasta complementa a [M5](../etapas/M5_REGISTRO_POR_POSSE.md) e detalha a evolução da [R4](../etapas/reformulacao-futebol/R4_DETALHES_OPCIONAIS.md). Não é outra versão nem um projeto paralelo. A prévia aprovada continua como referência visual; **os recursos novos desta pasta ainda não estão nela nem no aplicativo**.

## Experiência desejada

- Ao ativar **Registrar pressão**, uma pequena linha de botões permanece visível: Alta, Média, Baixa, Sem pressão e Não observada. Um toque registra; a linha continua disponível. Desativada, a tela volta à composição mínima.
- Deslocamentos relevantes e trechos anteriores a chutes podem receber um destaque discreto. O scouter pode abrir o trecho e informar passe, condução, domínio/recepção e autores, ou ignorar. Nenhuma pergunta abre sozinha.
- Uma sugestão nunca vira ação confirmada por silêncio, por aproximação entre atletas ou por uma linha desenhada no campo.

## Uma macroetapa por MD

| Ordem | Documento | Entrega delimitada | Estado |
|---|---|---|---|
| 1 | [A1 — contrato e arquitetura](A1_CONTRATO_E_ARQUITETURA.md) | Separar observação, sugestão e confirmação; vínculos e compatibilidade | Planejada |
| 2 | [A2 — pressão fixável](A2_PRESSAO_FIXAVEL.md) | Ativação opcional, altura da pressão e posição observada | Planejada |
| 3 | [A3 — trechos para completar](A3_TRECHOS_PARA_COMPLETAR.md) | Regras locais, destaque discreto e enriquecimento voluntário | Planejada |
| 4 | [A4 — validação do auxílio](A4_VALIDACAO_DO_AUXILIO.md) | Confirmar que o auxílio não atrapalha nem fabrica dados | Planejada |

Quando o usuário solicitar implementação: **R1 → R2 → R4 (A1 → A2 → A3 → A4) → R3 → M6**. A1–A4 são recortes da R4 ampliada, não quatro etapas extras a executar após uma segunda implementação da R4. Incorporar também saída, roubada e jogador já definidos na R4. Não refazer M0–M4. M7 continua responsável por revisão extensa; M8, pelos relatórios completos.

## Como retomar com o Luna

Ler [ESTADO](../ESTADO.md), este README e somente o MD solicitado, além das instruções da raiz. Inspecionar os arquivos indicados na etapa; preservar trabalho existente. Os prompts de cada MD são para uso quando houver solicitação de implementação, não autorização automática nesta rodada.

Critério transversal: se o recurso desvia atenção, exige preencher tudo ou aumenta o trabalho para registrar o básico, ele precisa ser simplificado antes de avançar.
