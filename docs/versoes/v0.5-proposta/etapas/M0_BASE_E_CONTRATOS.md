# M0 — Base e contratos

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** Nenhuma.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M0; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Confirmar a base local e definir contratos pequenos antes de alterar menus, cadastro ou registro. Esta etapa produz documentação curta; não implementa telas.

## Leitura de código

`src/ui/app/App.tsx`; `src/ui/screens/registrations/RegistrationsScreen.tsx`; `src/ui/screens/match-setup/NewMatchScreen.tsx`; `src/domain/match/entities/Registration.ts`; `src/domain/football/FootballObservation.ts`; entradas correspondentes de `src/application/ScoutTrainerService.ts`.

## Trabalho delimitado

1. Registrar versão, estado do Git e scripts disponíveis. Separar problemas encontrados de hipóteses; preservar alterações existentes.
2. Desenhar navegação global e da partida conforme M1, sem alterar rotas ainda.
3. Definir relação atleta permanente → vínculo com equipe → inscrição na partida. Camisa/função específicas não devem reescrever outras equipes ou jogos. Definir política para legados sem modalidade, sem classificação silenciosa como vôlei.
4. Definir rascunho de elenco estruturado, erros por linha, importação com prévia e persistência em lote recuperável. Não serializar formulário em texto para reparsá-lo.
5. Definir observação espacial, mudança de controle, posse/intervalos, chute e lacuna. Determinar como observações tipo 1000 entram nas projeções e no backup sem virarem eventos StatsBomb fictícios.
6. Anotar regras de autoria e localização de perda, elegibilidade de métricas e continuidade. Definir qual informação uma correção pode invalidar.

## Entrega e aceite

Criar `CONTRATOS_M0.md` na pasta deste pacote com decisões, campos necessários, compatibilidade e riscos concretos; atualizar ESTADO.md. Não criar schema gigante, implementar migração ou resolver pendências históricas fora do escopo. Contratos devem cobrir vôlei/futebol e coexistência dos modos de coleta.

## Verificação

Conferir caminhos, chamadas e testes relacionados. Não rodar a suíte inteira por uma etapa só documental; registrar que não houve alteração funcional.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M0_BASE_E_CONTRATOS.md.
Execute somente M0, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
