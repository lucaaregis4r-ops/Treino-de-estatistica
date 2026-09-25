# T01 — Tela mínima de futebol

**Versão:** 0.5 proposta. **Dependência:** base M3/M4 existente. **Resultado:** composição própria para acompanhar a bola. Ver status no ESTADO; não reiniciar a base.

## Entradas de código

`src/ui/screens/scout/football/FootballScoutScreen.tsx`, `FootballActionPanel.css`, `src/ui/screens/scout/FootballCourtSurface.tsx`, `GestureCourtInput.tsx`, `src/ui/app/App.tsx`, `src/application/ScoutTrainerService.ts`. Ler testes associados apenas no recorte afetado.

## Implementar

1. Separar apresentação mínima da detalhada, preservando acesso ao modo detalhado. Não montar todo o formulário antigo para depois esconder controles com CSS.
2. Cabeçalho único com equipes/placar/período/tempo; campo dominante; faixa de controle e comandos; região contextual estável; feedback discreto. Sem histórico extenso, coordenadas, formulários laterais ou acordeões táticos.
3. Toque no campo salva posição/tempo pelo serviço existente, sem escolher tipo de ação ou confirmar. Controle inicial explícito/desconhecido: não presumir A. Não criar atleta/posse para preencher ausência.
4. Exibir última posição observada e sua idade. Posição de outro segmento permanece identificada como antiga; trilha curta opcional de até cinco marcas não cruza troca, parada, lacuna ou período.
5. Uma fonte de controle. Desfazer, salvamento e falha recuperável funcionam desde esta etapa; horário capturado no gesto. Recarga usa estado confirmado.
6. Preparar espaço estável para resultados de T02. Não apresentar comandos sem comportamento como prontos. Orientação do campo respeita equipe/período e permanece consistente com dados armazenados.

## Aceite e testes

Um toque = um marco. Sem formulário detalhado na nova coleta. Campo e comandos essenciais cabem em 1366×768 e 1024×768; em móvel não se sobrepõem nem provocam overflow horizontal. Teclado/foco funcionam. Comparar com as duas referências do README. Testar marco, reload, falha/retry, desfazer e regressão do campo compartilhado; typecheck e inspeção visual real.

## Limites e passagem

Não modificar motor do vôlei, cadastro ou análises. Não adicionar detalhes táticos. Atualizar T01 no ESTADO com evidências e parar antes de T02, salvo autorização de escopo maior.
