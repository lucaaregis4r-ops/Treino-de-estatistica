# M6 — Piloto em velocidade normal

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M5.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M6; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Verificar se o operador consegue acompanhar o jogo. Esta etapa mede viabilidade; não é substituída por build ou cliques automatizados.

## Atualização de direção — 21/09/2026

O feedback qualitativo do usuário motivou a reabertura de M5 em R1–R3. Aplicar este piloto ao fluxo reformulado; não manter a aparência anterior para satisfazer um teste antigo. O relato de baixa praticidade já é evidência para simplificar, mesmo sem medidas cronometradas.

## Material e preparação

Usar trecho de 10–15 minutos de futebol disponível/autorizado, com circulação, trocas, paradas e finalizações. Se faltar vídeo ou observação do operador, preparar roteiro e coleta de medidas, registrar a dependência e manter etapa como Pendente de piloto. Não inventar resultado nem marcar aprovação operacional por uma simulação automatizada.

## Procedimento

1. Operador coleta em velocidade normal, sem pausar: início/troca de controle, chegada relevante a terço/corredor/área, perda e chute. Não exigir cada passe ou todos os movimentos laterais.
2. Depois revisar pausando para identificar referências de mudanças de controle, perdas e chutes. Marcar limites de precisão do vídeo/relógio.
3. Medir interações por minuto/posse, atraso de captura, chutes omitidos, trocas omitidas, correções e cobertura de início/fim/marcos. Registrar também dificuldade percebida e momentos em que se deixou de olhar o jogo.
4. Repetir após ajustes em outro trecho comparável, evitando confundir memorização com melhoria da interface.
5. Fazer cenário curto de menu/cadastro para futebol e vôlei, incluindo colar lista, corrigir camisa e reutilizar equipe.

## Metas e decisões

Metas provisórias: nenhum chute omitido no trecho e nenhuma fila persistente de registros. Definir atraso tolerável com o operador e dados do piloto; não impor número arbitrário como precisão validada. Contagem por clique não é medida de qualidade isolada.

Se sobrecarregar, simplificar primeiro granularidade espacial, detalhes e acesso aos controles. Priorizar controle/perdas/chutes. Não inventar preenchimento automático de atletas/passes para compensar omissão. Limitar correções desta etapa aos problemas observados; registrar qualquer mudança de contrato em M4.

## Entrega e aceite

Criar `RELATORIO_PILOTO_M6.md` com trecho/fonte, duração, protocolo, medidas, falhas, ajustes e conclusão demonstrada. M7 só começa após evidência operacional suficiente ou revisão explícita do escopo pelo usuário. Se o humano ainda não testou, escrever isso claramente. Rodar verificações apenas do código efetivamente alterado no ajuste.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M6_PILOTO_OPERACIONAL.md.
Execute somente M6, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
