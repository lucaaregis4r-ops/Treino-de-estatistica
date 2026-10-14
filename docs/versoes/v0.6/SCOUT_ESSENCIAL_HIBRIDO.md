# Scout Essencial híbrido — plano técnico da primeira versão

**Data:** 02/10/2026. **Escopo:** modo experimental adicional para futebol e futsal. Os modos atuais continuam disponíveis.

## Leitura do projeto

- `App.tsx` escolhe a tela de registro pela modalidade e mantém a partida carregada em `MatchWorkspace`; não há roteador de páginas.
- O futebol persiste eventos canônicos com ações, tempo e observação em `football_event_*`; o futsal persiste fatos próprios em `futsal_fact_*`. Ambos usam o mesmo `EventRepository` e histórico imutável em IndexedDB. Correções e desfazeres acrescentam eventos; não editam registros anteriores.
- `GestureCourtInput` já desenha `FootballCourtSurface` ou `FutsalCourtSurface`, captura ponto ou trajeto com mouse, toque e teclado, e devolve coordenadas normalizadas. O relógio de cada modalidade permanece sob seu serviço atual.
- As análises de posse/rally existentes trabalham com cobertura observada. Uma coleta seletiva dos quatro marcos não comprova uma posse completa; deve ficar marcada como esparsa/censurada para não inflar denominadores ou alimentar o modelo de contexto.
- O exportador/importador JSON valida tipos e fatos de forma fechada. Novas categorias do futsal e o identificador do modo exigem validação e teste de ida e volta. O formato legado deve continuar legível.

## Contrato mínimo

Comando compartilhado: `code: F | PF | PP | RP`, `teamId`, `playerId?`, `position?`, `destination?`, `outcome?` e `capturedElapsedMs?`. A posição fica em `[0,1] × [0,1]` no comando e na interface. Cada adaptador grava o tempo/período e o formato espacial da modalidade usando o histórico atual.

- `F`: finalização; resultado `gol`, `defesa`, `fora`, `bloqueada` ou `trave`. Um ponto identifica a origem; não se exige o trajeto da bola.
- `PF`: passe que criou uma chance, independentemente de gol. Pode ser salvo sem posição, só com origem, só com destino ou com ambos; nunca recebe automaticamente o rótulo de assistência.
- `PP`: perda da equipe indicada; posição observada quando disponível. O modo não inventa a equipe que recuperou.
- `RP`: recuperação da equipe indicada; posição observada quando disponível.

No futebol, essas ações usam `shot`, `pass`, `loss` e `ball_recovery` com um marcador `essential_code` na extensão local. No futsal, `shot` recebe esse marcador e entram fatos equivalentes para PF/PP/RP. A projeção compartilhada apresenta só os registros marcados, em ordem, com ID estável e equipe/atleta, tempo, posição e resultado. Não há `possessionId` persistido nem vínculo automático PF→F nesta etapa; a ordem, o período, a equipe e os limites explícitos permitem uma projeção futura sem afirmar continuidade não observada.

## Fluxo e arquivos

1. **Domínio/serviço:** criar contrato e projeção em `src/domain/essential/`; adaptar `FootballRecorder`, `FutsalScout` e `ScoutTrainerService` para registrar, corrigir e excluir por ID no histórico existente. Correção preserva ID e tempo; exclusão de registro corrigido remove a inscrição original na projeção.
2. **Interface:** criar `src/ui/screens/scout/EssentialScoutScreen.tsx` e CSS. Campo/quadra vêm de `GestureCourtInput`. Seletores de equipe e camisa ficam acima do campo; uma faixa mostra F/PF/PP/RP, estado pendente, resultado de F, salvar sem posição quando cabível, cancelar e desfazer. Histórico recente oferece edição e exclusão.
3. **Navegação:** em `App.tsx`, adicionar seletor de modo dentro de Registro somente para futebol/futsal. O modo atual é o padrão ao abrir uma partida; o essencial pode ser escolhido e abandonado sem converter dados existentes. O atalho T usa o relógio da modalidade.
4. **Compatibilidade:** validar os novos payloads em `MatchJson.ts` e preservar a importação anterior. Manter a saída de análises existente, com registros esparsos identificados e excluídos de estimativas que exigem posse completa.
5. **Aceite técnico:** testar os quatro códigos e atalhos nas duas modalidades, clique e teclado no campo, resultado do chute, troca de equipe/camisa, correção, exclusão após correção, desfazer, reabertura e backup. Rodar typecheck, lint, testes dirigidos/existentes e build; inspecionar desktop e celular.

## Limites deliberados

Não registrar passes comuns, inferir movimentação, atribuir assistência, estimar `possessionId`, calcular xG do futsal ou treinar novo Markov. Os relatórios de posse existentes só podem chamar uma sequência de completa quando seus próprios critérios de cobertura forem satisfeitos. O teste de velocidade com operador real continua necessário para avaliar se o modo serve durante a partida.

## Resultado da primeira implementação

- O modo está disponível na aba **Scout Essencial** de partidas de futebol e futsal. **Registro** continua abrindo o modo já existente. Os eventos são gravados no histórico imutável da partida, com código, equipe, atleta opcional, período, tempo e coordenadas normalizadas observadas.
- F, PF, PP e RP funcionam por botão, código digitado ou atalhos. `1`/`2` alternam a equipe, `J` foca a camisa, `T` controla o relógio, `Z` desfaz o último evento essencial e `Esc` cancela o rascunho. Após marcar o ponto, PP/RP são salvos; PF é salvo após o ponto ou trajeto escolhido; F é salvo assim que ponto e resultado estão definidos. PF, PP e RP também têm gravação sem localização.
- A cronologia suporta correção mantendo ID e tempo, exclusão após correção, reabertura e ida e volta no backup JSON. Um gol atualiza o placar; sua correção ou exclusão reverte esse efeito. Exportação StatsBomb pura omite fatos locais que não têm representação fiel, mantendo-os no backup completo.
- Os marcos seletivos encerram ou censuram cobertura contínua nos adaptadores de análise. Não são tratados como posse observada por inteiro, nem alimentam denominadores de contexto completo. O campo do futebol e a quadra de futsal são os componentes atuais de captura. No celular, ao iniciar um evento a tela aproxima campo/quadra e comandos necessários.

**Verificação dirigida:** `npm run typecheck`, lint dos arquivos envolvidos e `npm run build` passaram. `src/tests/integration/essential-scout-cycle.test.ts` e `src/infrastructure/export/json/MatchJson.test.ts` passaram (9 testes); `GestureCourtInput.test.tsx` passou (8 testes). `e2e/essential-hybrid.spec.ts` passou em futebol e futsal, incluindo atalhos de equipe, camisa e relógio e a visualização simultânea de resultado e campo no celular. `e2e/football-simple-actions.spec.ts` e `e2e/futsal-essential-scout.spec.ts` passaram nos modos existentes.

**Estado da suíte existente:** 111 arquivos e 548 testes Vitest passaram ao executar as demais suítes. Três suítes isoladas seguem com falhas fora do fluxo essencial: `AppFlow.test.tsx` (3 casos de voleibol), `SequenceAnalyticsPanel.test.tsx` (1 expectativa de título anterior) e `layer-boundaries.test.ts` (1 caso que inclui um arquivo de teste nas regras de importação). A suíte completa, portanto, ainda não está verde. O lint geral também encontra erros em testes e telas anteriores; o lint dos arquivos envolvidos nesta entrega passa. A avaliação de velocidade em partida real permanece pendente.

## Arquivos desta implementação

- Contrato, serviço e projeções: `src/domain/essential/EssentialScout.ts`, `src/application/ScoutTrainerService.ts`, `src/domain/football/FootballObservation.ts`, `src/domain/football/FootballRecorder.ts`, `src/domain/football/StatsBombContract.ts`, `src/domain/football/StatsBombOpenData.ts`, `src/domain/futsal/FutsalScout.ts`, `src/domain/futsal/FutsalAnalytics.ts`, `src/domain/analytics/observed-sequence/FootballObservedSequences.ts`, `src/domain/analytics/observed-sequence/FutsalObservedSequences.ts`, `src/infrastructure/export/json/MatchJson.ts`.
- Navegação e tela: `src/ui/app/App.tsx`, `src/ui/screens/scout/EssentialScoutScreen.tsx`, `src/ui/screens/scout/EssentialScoutScreen.css`, `src/ui/screens/scout/FutsalScoutScreen.tsx`, `src/ui/screens/manual/ManualScreen.tsx`.
- Verificação: `src/tests/integration/essential-scout-cycle.test.ts`, `e2e/essential-hybrid.spec.ts`.
- Plano e índice: `docs/versoes/v0.6/SCOUT_ESSENCIAL_HIBRIDO.md`, `docs/versoes/v0.6/README.md`, `docs/versoes/README.md`, `docs/COMECE_AQUI.md`.

## Ampliação: camisa, qualificadores e terços

Esta seção estende o contrato mínimo acima sem transformar o Scout Essencial em uma observação contínua da posse. Os quatro códigos permanecem `F`, `PF`, `PP` e `RP`. Cada registro pode guardar `shirtNumber` independentemente de `playerId`: a camisa observada é válida mesmo quando o atleta não está cadastrado. A identificação de um atleta cadastrado continua disponível quando existir correspondência.

`qualifiers` é uma lista opcional, sem repetições, de qualificadores específicos do fundamento. O operador pode marcar vários qualificadores observados na mesma ação. As letras abaixo pertencem **ao código compacto do Scout Essencial**; não alteram os códigos Data Volley do vôlei.

| Fundamento                  | Letras dos qualificadores no código compacto                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| F — finalização             | `L` livre; `P` sob pressão; `T` primeiro toque; `C` transição; `R` bola parada                      |
| PF — passe para finalização | `R` ruptura; `C` cruzamento; `P` pivô; `T` transição; `B` bola parada                               |
| PP — perda de posse         | `E` erro de passe; `D` desarmado; `M` mau domínio; `C` condução; `F` bola fora; `P` sob pressão     |
| RP — recuperação de posse   | `D` desarme; `I` interceptação; `R` rebote; `E` erro adversário; `P` pressão; `G` defesa do goleiro |

Em `F`, o resultado continua obrigatório: `G` gol, `D` defesa, `O` fora, `B` bloqueada ou `V` trave. Ele é diferente dos qualificadores e aparece imediatamente depois de `F` no código compacto. Em `PF`, o marcador registra um passe que criou uma chance, sem inferir assistência. Origem, destino e trajetória podem ser anotados conforme a observação. `PP` e `RP` pedem apenas o local da ação quando o ponto for conhecido; não exigem destino.

### Localização e direção

- `third` aceita `defensive`, `middle` ou `attacking`. O terço é relativo à **equipe selecionada e à direção de ataque dela no período**: defensivo, central e ofensivo. A interface divide visualmente o campo ou a quadra em três faixas e permite registrar o terço com um toque. A direção pode ser configurada por período; a troca de equipe ou de posse não gira o campo/quadra.
- Um ponto exato continua opcional. Quando o ponto foi observado, usa-se a coordenada normalizada real e o terço pode ser derivado dela e da orientação configurada. Sem orientação, a interface não deve apresentar uma inferência de terço a partir do ponto. Se apenas o terço foi observado, guarda-se o terço **sem inventar coordenada no centro da faixa**. Isto mantém mapas espaciais e cálculos que dependem de coordenada livres de precisão fictícia.
- No `PF`, um terço isolado deve indicar se descreve a origem ou o destino (`thirdAnchor`); a escolha acompanha o modo de captura. Uma trajetória com duas pontas usa as coordenadas observadas de ambas. O destino não é exigido para `F`, `PP` ou `RP`.

### Operação rápida

O campo de código aceita, sem distinção de maiúsculas/minúsculas ou espaços, `camisa? + fundamento + resultado de F + letras dos qualificadores + terço?`. O terço opcional no final usa `1` defensivo, `2` central e `3` ofensivo. Exemplos: `09FG3` registra gol da camisa 9 no terço ofensivo; `09PFCT3` registra passe para chance da camisa 9 qualificado como cruzamento e transição no terço ofensivo; `09PPD1` registra perda por desarme no terço defensivo. Sem o sufixo do terço, o comando prepara a marcação do ponto exato. Qualificadores também podem ser escolhidos por controles visíveis, sem obrigar o uso do código.

Fora dos campos de digitação, `1`/`2` selecionam a equipe e `3`/`4`/`5` selecionam os terços defensivo/central/ofensivo. `T` controla o relógio, `Z` desfaz e `Esc` cancela o rascunho. A separação entre o sufixo `1`/`2`/`3` do código compacto e os atalhos globais evita ambiguidade durante a coleta.

Correção, exclusão, reabertura e backup JSON devem preservar camisa, qualificadores e terço, sem preenchê-los artificialmente nos registros anteriores. Exportação StatsBomb pura deve omitir um `F` registrado apenas por terço, pois ele não contém o ponto de origem exigido por aquele formato. Os dados seletivos continuam fora dos denominadores que exigem posse completa.

### Resultado da ampliação

- A tela salva os comandos compactos com terço em um passo, mantém a camisa observada sem cadastro e oferece chips opcionais por fundamento. F exige resultado; PF permite indicar terço de origem ou destino. O ponto exato continua disponível na quadra/campo dividido em três e só gera terço derivado quando a direção de ataque da equipe no período está definida.
- O histórico, correções e backup JSON preservam os novos dados; corrigir removendo um qualificador ou trocando terço limpa os valores anteriores. A exportação StatsBomb pura omite finalização sem ponto exato.
- **Verificação:** typecheck, lint dirigido e build passaram; 12 testes dirigidos de domínio/integração/backup, 8 testes Playwright do Scout Essencial e 2 testes Playwright dos modos de registro existentes passaram. Conferência visual em 1366×900 e 390×844 confirmou a quadra dividida, controles legíveis e resultado/qualificadores/terços/quadra visíveis durante a marcação no celular.
