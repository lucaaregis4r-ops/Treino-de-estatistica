# M3 — Nova partida e reaproveitamento de equipes

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M1, M2.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M3; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Usar o mesmo editor de elenco na criação da partida e facilitar o reaproveitamento de equipes sem redigitar atletas.

## Leitura de código

`src/ui/screens/match-setup/NewMatchScreen.tsx`, `NewMatchScreen.sport.test.tsx`, criação da partida em `src/application/ScoutTrainerService.ts`, `src/ui/app/AppFlow.test.tsx`, editor produzido em M2.

## Fluxo

1. Modalidade explícita → escolher equipes salvas ou cadastrar rapidamente → revisar elenco/configurações → iniciar.
2. Equipes em colunas iguais no desktop e empilhadas no móvel. Buscar equipe e atleta existente; opção de copiar elenco recente com prévia. Alterações para esta partida não alteram cadastro permanente sem intenção explícita.
3. Remover o textarea como formulário principal. Equipe salva deve preencher objetos/linhas diretamente, sem conversão número/nome/função → texto → parser.
4. Incluir/remover/ajustar camisa na própria tela. Salvar equipe reutilizável como ação clara; não criar duplicatas a cada partida.
5. Futebol: permitir scout coletivo sem elenco; não exigir 11 atletas, escalação ou posição. Atleta desconhecido não vira cadastro permanente.
6. Vôlei: manter validações reais de escalação/rotação/líbero quando o modo exigir; não associar funções aos primeiros seis por ordem de cadastro sem revisão. Fluxos parciais já suportados devem continuar disponíveis. Dados de demonstração somente por ação explícita, não inventados silenciosamente.
7. Troca de modalidade preserva campos compatíveis e avisa antes de descartar dados incompatíveis. Evitar que uma mesma equipe histórica seja reinterpretada automaticamente como outra modalidade.

## Aceite e verificação

Criar e reabrir futebol sem elenco; criar vôlei com elenco/lineup válido; reutilizar equipe em segunda partida; mudar camisa nesta partida sem alterar a anterior; adicionar atleta sem sair da criação. Testar importação com prévia, conflito de números, rascunho ao navegar e trocas de modalidade. Verificar backups e migração dos vínculos se M2/M3 mudarem o schema. Rodar testes focados e typecheck. Preservar os registros já existentes.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M3_CRIACAO_E_REUSO_DE_EQUIPES.md.
Execute somente M3, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
