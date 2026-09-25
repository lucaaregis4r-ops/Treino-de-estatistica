# T08 — Concluir menus de futebol e vôlei

**Versão:** 0.5 proposta. **Base:** M1 parcial; integrar entregas T01–T07. **Resultado:** navegação clara e retomada segura, sem outro redesign.

## Entradas de código

`src/ui/app/App.tsx`, `app.css`, `App.test.tsx`, `AppFlow.test.tsx`; telas `matches`, `registrations`, `manual`, `training`. Inspecionar o que já foi entregue em M1 e corrigir somente pendências/regressões.

## Consolidar

- Global: Início, Partidas, Equipes e atletas, Treino, Ajuda. Configurações/perfis secundários identificáveis. Preservar todos os recursos funcionais.
- Início prioriza Nova partida e Retomar; Partidas mantém busca/filtro por modalidade/estado ao voltar. Equipes e atletas abre em Equipes, com cadastro individual acessível.
- Partida: um cabeçalho compacto com modalidade/equipes/placar, Registro/Resumo/Análise e acesso secundário a elenco, ajuda, exportação e revisão quando pertinente. Integrar destino T07 sem montar dois menus ou dois placares.
- Futebol oferece Por posse e Detalhado onde os dois estejam funcionais. Vôlei preserva modos existentes e escolha atual, sem receber controles específicos de futebol.
- Navegar não encerra partida, muda controle ou pausa relógio. Voltar usa ID correto. Preservar rascunho; antes de abandonar edição não salva oferecer salvar/descartar/cancelar quando necessário.
- Estado ativo acessível além de cor; teclado/foco/toque. Treino e ajuda indicam modalidades realmente suportadas.

## Aceite e testes

Uma ação global para Partidas/Equipes; retomar jogo correto; retorno após editar elenco e após revisão; filtros/rascunhos preservados; todos os recursos acessíveis. Verificar ambas as modalidades em desktop/móvel. Testes de navegação afetados e typecheck. Não transformar esta etapa em reescrita do app ou dos motores. Atualizar T08; próxima T09.
