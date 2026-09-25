# A1 — Contrato e arquitetura a serviço do scouter

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / R4 ampliada. **Estado:** planejada. **Dependência:** R1/R2. **Escopo:** contrato compatível, sem construir painéis de análise.

## Ler e inspecionar

[README](README.md), [R4](../etapas/reformulacao-futebol/R4_DETALHES_OPCIONAIS.md), `src/domain/football/FootballObservation.ts`, `FootballPossessionService.ts`, `FootballPressureEpisode.ts`, `src/application/ScoutTrainerService.ts` e `src/infrastructure/export/json/MatchJson.ts`. Confirmar contratos reais antes de escolher nomes/tipos. Os campos abaixo são requisitos conceituais, não um schema já implementado.

## Responsabilidades

1. **Coleta:** salvar posição, controle, chute e anotação explícita imediatamente, com ID e tempo capturados no gesto. A decisão de sugerir algo não bloqueia nem condiciona o salvamento.
2. **Sugestões:** função local e determinística sobre observações elegíveis. Produz candidatos com motivo e referências; não insere passes no fluxo de ações. Não requer API, modelo de IA, rede ou análise de vídeo.
3. **Apresentação:** preferências controlam apenas quais atalhos ficam visíveis. Mostrar no máximo um destaque/convite por vez e preservar campo/comandos. Não criar um painel geral de recomendações.
4. **Enriquecimento:** respostas voluntárias viram anotações ou ações explicitamente confirmadas, associadas ao trecho original. Usar os serviços existentes; nunca persistir direto da UI no IndexedDB.
5. **Análise:** consumir fatos elegíveis e expor cobertura. Candidatos e informações desconhecidas não entram como passes, autores, pressão contínua ou perigo confirmado.

## Dados que precisam continuar distintos

| Registro | Informação mínima | Não representa |
|---|---|---|
| Observação original | ID, partida/período, posse/controle, instante, posição opcional | Trajeto completo ou contato por contato |
| Pressão pontual | Equipe que pressiona, equipe com bola, instante-alvo, altura/ausência/desconhecido, ponto vinculado se elegível | Intensidade, duração ou posição de cada defensor |
| Candidato | IDs de origem, motivo, versão da regra, revisão das fontes, estado de revisão | Ação ou perigo confirmado |
| Resposta do scouter | Alvo, horário observado separado do horário de preenchimento, classificação e autores opcionais, procedência explícita | Identidade deduzida pela camisa do ponto anterior |

Usar IDs reais de atleta/inscrição da partida; camisa é apresentação. O horário de uma confirmação posterior não pode deslocar o evento para a posse atual. Quando só se conhece um intervalo, guardar intervalo/incerteza; não inventar o segundo exato do passe ou domínio.

Preferências (registrar pressão, exibir sugestões) são separadas dos fatos. Desligá-las não apaga dados; habilitá-las não preenche retrospectivamente o que faltou. Novos campos opcionais devem preservar backup completo, importação e partidas antigas. Não reinterpretar a pressão Individual/Coletiva existente como Alta/Baixa.

## Correções e consistência

- Chave estável por conjunto de fontes/motivo para não duplicar candidatos a cada render ou recarga. Regra versionada; não recriar candidato ignorado sem mudança material das fontes.
- Desfazer/corrigir/excluir fonte invalida a sugestão dependente. Resposta humana existente fica sinalizada para revisão, sem apagar silenciosamente nem contar ação órfã nas análises.
- Confirmação idempotente: repetir salvamento não duplica ação. Reutilizar evento detalhado já vinculado; não contar anotação e ação confirmada como duas ações.
- Eventos de coleta têm prioridade na fila. Erro ao salvar detalhe mantém resposta recuperável sem apresentar sucesso falso, sem sequestrar foco ou impedir coleta.
- Lacunas, paradas, disputa e troca de período/posse são fronteiras explícitas. Não unir dados através delas para gerar um suposto lance contínuo.

## Entrega e aceite

Registrar decisões finais de schema e reutilização no ESTADO; implementar somente os contratos/serviços necessários à extensão, preservando comportamento. Testes direcionados: dados antigos, backup/recarga, confirmação duplicada, desfazer fonte e autoria desconhecida. Typecheck. Não antecipar A2/A3 nem reescrever o motor de posse.

## Prompt para o Luna

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md e registro-assistido/README.md
e registro-assistido/A1_CONTRATO_E_ARQUITETURA.md dentro desse pacote.
Execute somente A1 da R4 ampliada, após R1/R2. Inspecione o contrato existente;
separe observação, sugestão e confirmação. Preserve dados e ações existentes.
Registre evidências em ESTADO.md e pare antes de A2.
```
