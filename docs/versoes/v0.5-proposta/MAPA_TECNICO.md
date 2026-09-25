# Mapa técnico — 0.5 proposta

Inspeção documental do checkout em 21/09/2026; confirmar antes de editar. Caminhos relativos à raiz do repositório.

| Responsabilidade | Arquivos existentes | Observação |
|---|---|---|
| Navegação | `src/ui/app/App.tsx`, `src/ui/app/app.css` | Menu global e Registro/Resumo/Análise já existem; melhorar, não duplicar |
| Cadastro geral | `src/ui/screens/registrations/RegistrationsScreen.tsx`, `registrations.css` no mesmo diretório | Formulário individual já tem campos separados; posições oferecidas são de vôlei |
| Cadastro da partida | `src/ui/screens/match-setup/NewMatchScreen.tsx` | `playerRegistrations` divide texto por vírgula/linha/ponto e vírgula e interpreta número/nome/função; equipe salva volta a ser convertida em texto |
| Identidade | `src/domain/match/entities/Registration.ts`, `Player.ts`, `Team.ts` | Cadastro permanente e jogador da partida têm responsabilidades diferentes |
| Serviço | `src/application/ScoutTrainerService.ts` | Criar partida, atletas, eventos e observações de controle |
| Persistência | `src/infrastructure/persistence/repositories/`, `src/ui/app/createBrowserService.ts` | Reaproveitar repositórios; não escrever IndexedDB direto na UI |
| Controle/posse | `src/domain/football/FootballObservation.ts`, `FootballPossessionService.ts` | Há controle e cobertura; a projeção exclui tipo 1000 dos eventos da posse |
| Registro futebol | `src/ui/screens/scout/football/FootballScoutScreen.tsx` | Campo depende da seleção de ação; exige formulário de evento |
| Campo | `src/ui/screens/scout/FootballCourtSurface.tsx`, `GestureCourtInput.tsx` | Superfície/gestos existentes; preservar contratos do vôlei |
| Pressão/contexto | `src/domain/football/FootballPressureEpisode.ts`, `FootballPressureAnalytics.ts`, `src/ui/screens/scout/football/FootballContextDrawer.tsx`, `FootballTacticalQuestion.tsx` | Reutilizar conceitos com validade temporal explícita |
| Chutes/modelos | `src/ui/screens/scout/football/FootballShotPanel.tsx`, `src/domain/football/FootballModels.ts` | xG local por geometria; ΔxT atual depende de passe/condução |
| Análises | `src/ui/screens/summary/FootballAnalyticsPanel.tsx`, `FootballPitchPlot.tsx`, `src/domain/football/FootballMarkovAnalyzer.ts` | Adaptar ao modo/qualidade de coleta, sem disfarçar marcos de ações |
| Intercâmbio | `src/infrastructure/export/json/MatchJson.ts`, `src/domain/football/StatsBombOpenData.ts` | Backup completo distinto do subconjunto StatsBomb |

Verificações existentes úteis: `src/ui/app/AppFlow.test.tsx`, `src/ui/app/App.test.tsx`, `src/ui/screens/match-setup/NewMatchScreen.sport.test.tsx`, `src/tests/integration/registrations.test.ts`, `src/tests/integration/football-recording-cycle.test.ts`, testes em `src/domain/football/`, `src/infrastructure/export/json/MatchJson.test.ts` e `e2e/football-redesign.spec.ts`.

Não reabrir todo o repositório em cada rodada. Usar o recorte da etapa e ampliar somente se as dependências reais exigirem.
