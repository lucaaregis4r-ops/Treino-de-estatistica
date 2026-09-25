# M2 — Cadastro rápido e editor de elenco

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M0.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M2; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Eliminar a necessidade de digitar uma linguagem de vírgulas, espaços e barras. O formulário estruturado é o caminho principal; colagem é uma facilidade adicional.

## Leitura de código

`src/ui/screens/registrations/RegistrationsScreen.tsx`, `registrations.css`, `src/domain/match/entities/Registration.ts`, repositórios correspondentes e `src/tests/integration/registrations.test.ts`. Usar CONTRATOS_M0.md.

## Editor compartilhado

- Uma linha por atleta: **Camisa | Nome | Posição/função opcional | Remover**. Campos independentes; adicionar por botão e Enter no último campo. Tab navega; Enter não salva a partida inteira acidentalmente. Composição de texto e controles abertos não disparam inclusão indevida.
- Cadastro individual: Salvar e adicionar próximo, mantendo equipe/modalidade. Erros aparecem junto da linha/campo, sem apagar entradas válidas ou deslocar o foco inesperadamente.
- Nome composto, acentos, hífen e apóstrofo preservados; aparar bordas/espaços repetidos sem alterar identidade. Camisa pode faltar no cadastro permanente e ser preenchida para uma partida quando necessária.
- Vôlei oferece suas funções; futebol oferece posições próprias ou não informada. Não armazenar goleiro como líbero nem forçar papéis de vôlei no futebol.
- Camisa duplicada é erro no mesmo elenco da partida, não entre equipes diferentes. Homônimos são permitidos; sugerir correspondências existentes, sem fundir por nome.

## Colar lista / planilha

Aceitar linhas como `8 Ana Souza`, `8;Ana Souza` e duas colunas tabuladas copiadas de planilha; aceitar espaços extras, linhas vazias e CRLF. Prévia editável mostra camisa/nome/função antes de gravar. Cabeçalho e ordem das colunas podem ser confirmados na prévia. Lista só de nomes entra com camisa pendente. Formato antigo separado por vírgulas pode ser opção explícita; vírgula dentro de nome não pode separar registros silenciosamente. Entrada ambígua fica destacada para corrigir.

Nunca descartar linhas inválidas silenciosamente, adivinhar números ou salvar parcialmente sem informar. Definir transação ou recuperação idempotente para falha no lote; repetir Salvar não duplica atletas já gravados. Não adicionar dependência de planilha apenas para colar TSV.

## Aceite e verificação

Cadastrar elenco de ambas as modalidades sem vírgulas obrigatórias; importar e corrigir prévia com teclado/toque; conflito local claro; recarregar preserva IDs e vínculos. Exercitar nome composto, homônimo, camisa repetida entre equipes, espaços, linha inválida e falha/repetição do lote. Testes focados de parsing/identidade/persistência e typecheck. Não implementar ainda a nova tela de partida.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M2_CADASTRO_RAPIDO_ATLETAS.md.
Execute somente M2, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
