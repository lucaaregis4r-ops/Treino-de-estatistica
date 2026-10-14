# Scout Trainer 0.6 — futsal e substituições

**Estado:** M0–M7 implementadas; M8 em validação parcial, com entrega bloqueada pela suíte integral e inspeção/piloto pendentes. O aplicativo continua declarado como versão 0.5.0 até fechar a entrega. **Data:** 01/10/2026. **Responsável previsto pela execução:** Luna.

Esta pasta é o roteiro da **versão 0.6**. A versão declarada do aplicativo no código continua 0.5.0 até uma etapa de entrega autorizar sua alteração. A linha 0.5.0 permanece documentada em [`v0.5-proposta/implementacao-terra`](../v0.5-proposta/implementacao-terra/README.md), com piloto humano T10 e análises T11 pendentes; a criação deste plano não encerra essas pendências.

## Ordem de leitura

1. [`PLANO_IMPLEMENTACAO_LUNA.md`](PLANO_IMPLEMENTACAO_LUNA.md): escopo, decisões e sequência.
2. [`REFERENCIAS_E_DECISOES.md`](REFERENCIAS_E_DECISOES.md): regras, artigos e decisão sobre xG.
3. [`CONTRATOS_M0.md`](CONTRATOS_M0.md) e [`ESTADO.md`](ESTADO.md): decisões fechadas e situação atual.
4. Apenas o arquivo da etapa solicitada em [`etapas/`](etapas/).

## Etapas

| Ordem | Documento                                                                | Entrega                                                      |
| ----- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| M0    | [Contratos e auditoria](etapas/M0_CONTRATOS_E_AUDITORIA.md)              | Separação das modalidades e invariantes                      |
| M1    | [Corrigir substituições existentes](etapas/M1_CORRIGIR_SUBSTITUICOES.md) | Troca funcional no futebol e regressão do vôlei              |
| M2    | [Modalidade e quadra de futsal](etapas/M2_MODALIDADE_E_QUADRA.md)        | Nova partida, navegação e quadra própria                     |
| M3    | [Relógio e tecla T](etapas/M3_RELOGIO_TECLA_T.md)                        | Tempo efetivo persistido e operação segura                   |
| M4    | [Scout essencial](etapas/M4_SCOUT_ESSENCIAL.md)                          | Controle, eventos, gols, reinícios e faltas                  |
| M5    | [Substituições do futsal](etapas/M5_SUBSTITUICOES_FUTSAL.md)             | Trocas volantes, composição observada e goleiro-linha        |
| M6    | [Tática e revisão](etapas/M6_TATICA_E_REVISAO.md)                        | Contextos opcionais sustentados pela literatura              |
| M7    | [Análises e xG](etapas/M7_ANALISES_E_XG.md)                              | Resumo descritivo, cobertura e barreira ao modelo de futebol |
| M8    | [Validação e entrega](etapas/M8_VALIDACAO_E_ENTREGA.md)                  | Regressão, piloto real e documentação                        |

Executar uma etapa por solicitação. Cada MD termina com critérios de aceite e prompt para o Luna. Ao concluir uma etapa, relatar arquivos, comportamento, testes realmente executados, riscos e próxima etapa; não iniciar a próxima automaticamente.

Resultado da rodada M8: [M8_RESULTADO_VALIDACAO.md](etapas/M8_RESULTADO_VALIDACAO.md). A suíte total não terminou e a versão do aplicativo não foi alterada.

**Aditivo em execução:** [sequências completas por rally/posse e scout mínimo de futsal](aditivo-cadeias-e-scout-minimo/README.md), com etapas S0–S4 implementadas e S5 de validação pendente. É escopo solicitado após M0–M8.

**Experimento adicional:** [Scout Essencial híbrido para futebol e futsal](SCOUT_ESSENCIAL_HIBRIDO.md), um modo alternativo de quatro eventos seletivos. Seu plano e aceite são independentes da entrega M8 e da validação S5.

**Revisão de escopo:** [fundamentos e registro do jogo](FUNDAMENTOS_E_REGISTRO_DO_JOGO.md) reúne a pesquisa sobre o que acrescentar aos quatro eventos do Scout Essencial e uma sequência de implementação proposta. Não altera o estado das etapas M0–M8.
