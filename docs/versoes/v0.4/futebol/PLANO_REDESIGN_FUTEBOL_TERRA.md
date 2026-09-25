> **Versão/escopo:** Base 0.4.0; revisão do futebol em 20/09/2026.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../COMECE_AQUI.md).

# Redesign do registro e análises de futebol — plano para Codex Terra

Data: 20/09/2026. Revisão 2: contexto tático recuperado das conversas anteriores. Status: especificação; implementação ainda não realizada.

## 1. Objetivo e limites desta auditoria

Tornar o registro utilizável durante uma partida e reconstruir **como a posse nasce, enfrenta a oposição, progride, cria perigo e termina**. Responder continuamente: quem controla a bola, onde e como o adversário pressiona, como a equipe responde e o que acontece após a perda. Disponibilizar resumo, mapas, sequências táticas, Markov contextual, xG e xT com denominadores e cobertura verificáveis.

### Contexto recuperado e correção de escopo

Foram lidas as conversas **Construir arcabouço tático** (`6aac3635-6970-83e9-b8af-189022ecb764`) e **Plano de implementação futebol** (`6aae6bbf-3a28-83e9-96c9-24cd57cc4f98`), além dos planos F3–F5 em `docs/versoes/v0.4/futebol/base-f1-f5/`. São decisões recuperadas: posse como unidade central; perguntas contextuais em vez de exigir classificação tática completa; comparação de saídas 3+1/3+2; pressão individual/coletiva e bloco adversário; resposta por passe/condução/bola longa; quebra de linha e recepção; reação pós-perda; origem das posses perigosas; participação dos atletas; referência StatsBomb separada dos dados táticos locais; reutilização do campo gestual existente e passe sem domínio.

A primeira revisão deste plano simplificava indevidamente pressão para um indicador por ação e priorizava um Markov de nove zonas. Esta revisão restaura a análise tática como requisito central. Os contratos exatos, regras de denominador e testes abaixo são especificações novas para concretizar aquelas discussões, não funcionalidades já implementadas nem decisões antigas literalmente idênticas.

“Pressão não é salva” descreve especificamente a ligação ausente entre o controle da tela atual e o serviço de registro: não significa que o conceito foi descartado, nem que todo dado importado ou backup necessariamente perdeu pressão. Documentos antigos declaram a F3 concluída, mas o fluxo ativo inspecionado não encaminha seu contexto ao gravador. Preservar quaisquer campos já existentes em backups/importações.

Auditoria baseada no código do checkout atual, contratos, testes e documentação local. Não foi realizada avaliação visual em navegador nem teste com operador; metas de ergonomia abaixo são critérios de implementação, não resultados medidos. Há muitas alterações pré-existentes e arquivos ainda não rastreados. Preservar esse trabalho; não resetar, substituir arquivos inteiros por versões antigas ou usar planos antigos como prova de funcionalidade concluída. Nenhum AGENTS.md foi encontrado dentro deste projeto na inspeção.

Validação executada nesta auditoria: `npm test -- src/domain/football src/tests/integration/football-recording-cycle.test.ts` concluiu com **4 arquivos e 18 testes aprovados**. Isso valida somente a suíte existente selecionada; ela não cobre todos os problemas acima (por exemplo, o teste de posse perigosa usa outcome de chute em string). Não foram executados build, lint, typecheck ou E2E nesta entrega exclusivamente documental.

## 2. Diagnóstico rastreável

| Prioridade | Evidência atual | Consequência | Correção |
|---|---|---|---|
| P0 | `src/ui/app/App.tsx`: botões Resumo/Análise e telas correspondentes condicionados a `workspaceSport === 'volleyball'` | Futebol não tem acesso às análises | Rotas e telas específicas para futebol |
| P0 | `FootballScoutScreen.tsx` monta `<FootballContextDrawer />` sem `onChange`; `RegisterFootballEventInput` não recebe contexto | Pressão e contexto preenchidos não chegam ao evento | Estado controlado, contrato de entrada, persistência e restauração |
| P0 | `FootballAnalyticsPanel.tsx` calcula `points`, mas renderiza contagens e listas, sem campo/camadas; não é montado pelo App | Botões Ações/Trajetórias/Densidade não produzem mapas | Integrar painel e desenhar camadas reais |
| P0 | `registerFootballEvent` incrementa posse comparando o nome da equipe selecionada com a última posse | Perda não encerra posse automaticamente; retomada da mesma equipe e mudança de período podem ser agrupadas incorretamente | Projeção determinística de controle, reinícios e segmentos de posse |
| P0 | `FootballAnalytics.ts` compara `shot.outcome === 'Goal'`; gravador salva `{id, name}`; teste usa string | Gol salvo pode não aparecer como posse perigosa; filtros de resultado inconsistentes | Leitor de resultado normalizado e fixtures produzidas pelo gravador real |
| P1 | Equipe do evento e posse em dois selects independentes; dez ações com peso visual semelhante | Operador precisa interpretar e repetir contexto | Barra de controle, sugestões explícitas e ações agrupadas |
| P1 | Pressão escondida, em inglês; não existe opção explícita de ausência de pressão | Não distingue oposição coletiva, localização e resposta | Controle contextual: Não observado / Livre / Individual / Coletiva, com identidade das equipes, episódio espacial e resposta |
| P1 | `clearDraft` mantém atleta e seleção de posse; não existe receptor de passe no fluxo ativo | Atleta anterior pode ser indevidamente reutilizado | Receptor opcional, controle atual derivado e confirmação de sugestões |
| P1 | `edit` reconhece resultado de passe/chute, não de drible/desarme; procura pessoas por nome; trocar ação limpa `editingId` | Correção pode perder semântica ou criar registro novo | Identidades estáveis, rascunho controlado e modo de correção persistente |
| P1 | `correctFootballEvent` recria evento com campos básicos, sem validação espacial equivalente ao registro | Correção pode apagar extensões/dados e aceitar entrada incompleta | Validação compartilhada, patch com remoções explícitas e preservação de campos não editados |
| P1 | `GestureCourtInput` mantém marcações internamente e não recebe geometria inicial de edição | Rascunho restaurado pode não ser visível no campo | Geometria controlada/inicial explícita; teste de edição |
| P1 | `footballOrientation` existe, mas configuração inicial só define períodos; inversão visual é estado separado | Terço ofensivo/xG/xT não podem assumir ataque para x120 | Orientação por equipe/período e normalização analítica explícita |
| P1 | `FootballShotPanel.tsx` existe, mas não é integrado | Contexto de chute e alvo não estão conectados ao fluxo ativo | Um único editor de finalização, eliminando duplicação de resultados |
| P1 | `FootballReferenceMarkov.ts` apenas combina distribuições fornecidas; referência gerada usa fixture pequena | Não há cadeia local espacial nem diagrama; referência não é modelo treinado | Extrator de transições, matriz, grafo e modelo separado |
| P1 | Não há cálculo de posse temporal, resumo de chutes ou motor local xG/xT no módulo de futebol | Solicitação não se resolve só com CSS | Contratos de métricas e implementação em etapas |

Arquivos da tabela sem diretório: UI em `src/ui/screens/scout/football/`, painel em `src/ui/screens/summary/`, domínio em `src/domain/football/`, serviço em `src/application/ScoutTrainerService.ts`.

Também revisar `buildPossessions`: chave atual usa apenas número e cada evento sem número vira uma posse aberta isolada; `complete` depende de `possession_closed`, que o gravador ativo não escreve. Dados antigos exigem tratamento de cobertura, não inferência silenciosa de completude. O adaptador importado preserva `raw`, mas não garante uma extensão `scout_trainer` real; seletores devem aceitar ausência dessa extensão.

## 3. Experiência proposta

### 3.1 Layout de registro

```text
Azul 0 × 0 Verde         1º tempo 12:34 [Pausar]        [Registro] [Resumo] [Análise]
COM A BOLA: [Azul] [Verde] [Em disputa] [Parada] [?]    Atleta: #8 / Não identificado
                                  Ataque Azul →   [Orientação]
┌─────────────────────────────────────────────┬───────────────────────────┐
│ CAMPO                                       │ AÇÃO                      │
│ última posição confirmada + rascunho         │ Passe  Condução  Drible   │
│ origem ● ───────────────→ destino            │ Finalização               │
│                                             │ Recuperar  Desarme  Perda  │
│ dica: marque o destino                       │ Mais: falta/substituição  │
│                                             │ Resultado contextual      │
│                                             │ PRESSÃO NESTA AÇÃO        │
│                                             │ [?] [Livre] [Ind.] [Col.]  │
│                                             │ DEPOIS DA AÇÃO            │
│                                             │ [Azul] [Verde] [Disputa]   │
│                                             │ [Parada] [Não observado]   │
└─────────────────────────────────────────────┴───────────────────────────┘
Passe · #8 → #10 · completo · sob pressão · Azul mantém     [Cancelar] [Registrar]
Posse 12 · saída 3+1 · Verde em bloco alto                 [Alterar contexto]
Pergunta pertinente: superou a pressão? [Sim] [Não] [?]     [Detalhar depois]
Última ação: 12:31 Passe #6 → #8                             [Corrigir] [Desfazer]
```

O campo ocupa a esquerda e o painel de ação 300–340 px à direita em desktop. Usar cabeçalho compacto, sem duplicar nome, placar e comandos do workspace. Histórico completo, exportação, ajuste de placar e contexto tático ficam em seções secundárias. Cor de equipe deve vir acompanhada de nome; disputa usa texto/ícone próprio. Bola indica a última posição observada, não tracking em tempo real; mostrar horário e nunca interpolar movimento.

Em 1366×768 e 1024×768, campo, ação, pressão, pós-ação e confirmação devem caber na área útil sem rolagem no percurso principal. Em 390×844 usar cabeçalho compacto, campo antes do painel e barra inferior fixa com espaço reservado; rolagem vertical é aceitável, horizontal não. Controles ≥44 px; foco visível e texto legível. Usar tokens existentes e CSS restrito a futebol. Não comprimir o campo até torná-lo difícil de marcar apenas para cumprir altura.

### 3.2 Percurso e redução de esforço

1. Informar controle inicial; atleta continua opcional. Selecionar equipe não fabrica um toque ou uma ação.
2. Escolher ação. Mostrar só resultados relevantes; ações com resultado único usam `observed` automaticamente.
3. Marcar origem/destino por clique ou arrasto. Oferecer última posição como sugestão claramente identificada, sem confirmá-la como observação nova automaticamente.
4. Informar resultado e, quando necessário, controle após a ação. Qualificar pressão e responder à pergunta pertinente ao trecho da posse, conforme seção 3.3. A pressão pontual não é copiada automaticamente; um episódio explicitamente iniciado pode continuar com indicador visível até seu encerramento.
5. Registrar uma vez; feedback curto e próximo do campo. Atualizar estado confirmado somente após persistência; falha preserva rascunho.

Passe completo pode sugerir a mesma equipe e receptor como próximo atleta; receptor só é atribuído se identificado. Passe incompleto, drible perdido ou chute bloqueado não significam automaticamente controle adversário: oferecer disputa, fora/parada ou adversário. Finalização defendida pode gerar rebote. Gol encerra o segmento, coloca bola parada e sugere reinício adversário; não inicia relógio de posse adversária antes da saída observada.

Separar equipe executora da ação do controlador da bola: desarme/falta podem ser executados por quem não tem posse. A escolha de ação defensiva pode sugerir adversário, mas deve mostrar a equipe executora no resumo. Perda e recuperação vinculadas à mesma troca contam uma única troca; não fabricar um segundo evento de recuperação sem observação.

No modo básico usar uma confirmação explícita, sem salvar ao escolher resultado. Atalhos propostos: P passe, C condução, D drible, F finalização, R recuperação, Enter registrar, Esc cancelar; só ativos fora de campos editáveis e sem conflitar com controles focados. Exibir ajuda de atalhos. Alternativa ao gesto: seletor acessível de zona e ajuste de coordenadas; manter precisão de zona registrada no dado.

Meta de fluxo: após contexto inicial, passe com atleta não identificado e pressão não observada exige ação + gesto + resultado + confirmação (4 interações principais; 5 com dois cliques no campo). Não impor preenchimento tático para salvar.

### 3.3 Perguntas táticas que acompanham a posse

Manter **Partida → Posse → Trecho/estado tático → Ação → Resultado**. Exibir uma pergunta principal por vez, dispensável com “Não observado” e editável depois. Respostas permanecem vinculadas ao evento/trecho correto, nunca à posse seguinte por acidente. Não substituir o gesto já funcional nem tornar ação pontual uma trajetória obrigatória.

| Gatilho | Pergunta curta | Registro e validade |
|---|---|---|
| Saída observada desde trás | Como organizou a saída? | Cartões com pequenos diagramas: 2+1, 2+2, 3+1, 3+2, 2+3, 4+1, direta, outra, não observada. Vale para a construção desta posse até mudança explícita |
| Contexto adversário observado | Onde está o bloco? | Alto/médio/baixo/desconhecido; altura territorial separada de intensidade da pressão. Compactação opcional |
| Ação com bola ou início de oposição | Como estão pressionando? | Livre/individual/coletiva/não observado; equipe que pressiona e equipe pressionada visíveis |
| Progressão sob pressão | Como tentou sair? | Método derivado da ação quando possível: passe/condução/drible/bola longa/duelo–segunda bola; recuo e inversão derivados da geometria com regra documentada |
| Resposta observada | Superou a pressão? | Sim/não/não observado; manter a bola ou acertar passe não confirma superação |
| Progressão pertinente | Quebrou uma linha? | Não/primeira pressão/meio/última/mais de uma/não observado |
| Recepção após progressão | Onde recebeu em relação às linhas? | À frente/entrelinhas/costas/não observado. Separar de domínio: controlou/tocou sem dominar/interceptado/fora/não observado |
| Perda confirmada | Como reagiu quem perdeu? | Pressionou imediatamente/temporizou/recompôs/não observado; ligar à perda e à posse adversária seguinte |

A estrutura de saída e bloco são snapshots observados com início de validade; não perguntar a cada passe, mas permitir alterar durante a posse. A seleção de pressão em uma ação qualifica somente essa ação por padrão. Oferecer **“acompanhar este episódio”** para sequência contínua: badge “Verde pressiona Azul · coletiva · desde 12:34”, opções mudou/cessou/superada/não observado. Ao trocar equipe com controle, parar jogo, mudar período ou suspender observação, encerrar ou marcar episódio censurado; nunca herdar pressão automaticamente para a equipe oposta.

Quebra de linha não nasce só de avanço em x: requer observação ou geometria defensiva efetivamente registrada. Linhas defensivas sugeridas por bloco não são posições medidas. Formação nominal não substitui estrutura da saída. A primeira versão usa perguntas; inferência por linhas é evolução, não condição para entregar o fluxo.

## 4. Contratos de dados e regras de controle

Implementar tipos equivalentes aos seguintes; nomes finais podem seguir convenções locais, mas preservar a semântica:

```ts
type BallControl =
  | { kind: 'controlled'; teamId: string; playerId?: string }
  | { kind: 'contested' }
  | { kind: 'dead_ball'; restartTeamId?: string }
  | { kind: 'unknown' };
type PressureKind = 'unknown' | 'none' | 'individual' | 'collective'
  | 'present_unspecified'; // compatibilidade: pressão conhecida, tipo ausente
type ActionPressure = {
  kind: PressureKind;
  pressingTeamId?: string;
  pressedTeamId?: string;
  pressingPlayerId?: string;
  episodeId?: string;
  provenance: 'operator_observed' | 'provider_imported';
};
type ObservedControlChange = {
  after: BallControl;
  reason: 'maintained' | 'turnover' | 'recovery' | 'out' | 'foul'
    | 'goal' | 'restart' | 'period_end' | 'unknown';
};
```

- Preservar envelopes append-only. Adicionar eventos de observação de controle/reinício/cobertura quando ocorrerem fora de uma ação; quando associados à ação, salvar como uma transação lógica desfazível. Escolher um envelope com alteração embutida ou append atômico do conjunto, nunca dois salvamentos independentes.
- Projeção deve retornar `ballControl`, posição observada com origem/horário, segmentos de posse e intervalos de cobertura. UI não mantém contadores paralelos.
- Ação pertence ao segmento anterior quando termina em perda. Recuperação confirmada inicia novo segmento. Disputa encerra intervalo de controle temporal; se a mesma equipe retomar sem reinício, pode manter a cadeia ofensiva, mas os segundos disputados ficam fora do tempo controlado. Identificar cadeia ofensiva e intervalo temporal separadamente.
- Parada encerra segmento; reinício começa outro mesmo com a mesma equipe. Troca de período encerra ambos. Desconhecido quebra a elegibilidade para conexões analíticas que exigem continuidade.
- Usar IDs internos estáveis; manter mapeamento explícito para IDs numéricos de intercâmbio. Nunca reconciliar por nomes duplicáveis ou pelo índice mutável da lista de atletas.
- Estender entrada do serviço e extensão local com pressão por ação, contexto tático da posse, contexto de chute, receptor, alteração de controle, precisão espacial e observação temporal. Não mapear `low` legado automaticamente para `none`. Extensão ausente significa desconhecido.
- Capturar horário da ação quando o operador inicia a captura (ou marca no campo), não apenas quando confirma após preencher o formulário. Permitir ajustar; preservar milissegundos na correção. Horário de persistência continua separado. Usar tempo por período para ordem/duração, sem subtrair minutos acumulados entre períodos.
- Relógio pausado não acumula posse; incluir controle explícito de pausa/retomada da observação para lacunas de scout. Não presumir cobertura contínua em partidas antigas.
- Validação comum para registrar/corrigir: equipe/atleta válidos, pares ação–resultado permitidos, coordenadas finitas e nos limites, destino quando exigido, identidades de controle coerentes. Perda pode ser registrada sem posição, mas oferecer marcação para o mapa de perdas.
- Correção mantém identidade, ordem e campos não editados. Reprojetar controle e posses posteriores a partir das observações; não preservar números incoerentes de posse como fonte de verdade. Desfazer deve usar ordem das operações no histórico, inclusive correção de evento antigo, não somente o último elemento da lista de registros.
- Backups antigos carregam sem conversão destrutiva. Versionar novos campos conforme convenção do projeto, atualizar manifesto/validador e testar round-trip. Não escrever estimativas locais em `statsbomb_xg` nem preencher observações ausentes.

### Contrato adicional: oposição e resposta

Criar `FootballTacticalState.ts`, `FootballPressureEpisode.ts` e `FootballTacticalQuestions.ts` no domínio (ou módulos equivalentes). Snapshot tático referencia `possessionId`, `fromEventId`, equipe com bola, estrutura de saída, bloco adversário, compactação opcional e proveniência. Preservar valores low/medium/high legados como **intensidade qualitativa**, sem convertê-los em altura do bloco, pressão individual ou coletiva.

Episódio de pressão contém ID estável, equipe que pressiona, equipe pressionada, início/fim observados, IDs das ações vinculadas, localização da bola sob pressão, localização do defensor apenas se observada, tipo e mudanças de contexto. Campos de fim: `escaped`, `control_lost`, `stoppage`, `ceased`, `unknown`; fim não observado é censurado. Pontos da bola no decorrer do episódio formam trilha de observações, não tracking. Uma marcação pontual tem duração desconhecida, nunca zero interpretado como duração medida.

Resposta tática contém ação/episódio de origem, método, direção derivada, domínio, quebra de linha, recepção, `escapedPressure: yes/no/unknown`, alteração de controle e reação pós-perda quando aplicável. Uma recuperação posterior pode estar ligada ao episódio e à perda original; ligação temporal não autoriza afirmar que pressão causou a recuperação. Registrar causação somente como qualificação explícita do observador, separada da associação analítica.

Evitar dupla contagem: pressão contextual ligada a um passe não vira um segundo passe nem nova posse. Um evento defensivo de pressão importado/observado e a marca under_pressure da ação ofensiva podem descrever o mesmo episódio; relacionar por IDs/evidência ou sinalizar vínculo desconhecido, sem deduplicar por simples proximidade presumida. `under_pressure` importado não informa sozinho qual atleta pressionou nem se a pressão foi coletiva.

### Orientação

Guardar coordenadas observadas na referência física definida no projeto. `flipped` só modifica visualização/interação. Calcular separadamente coordenada ofensiva via equipe e período; usar `orientStatsBombLocation` após verificar referência de origem. Dados de provedor podem já estar normalizados: registrar esse fato e não inverter duas vezes. Sem orientação confiável: permitir mapa físico com aviso, mas excluir do cálculo de terço ofensivo/xG/xT que dependa dela. Configurar direção inicial na criação e confirmar troca no intervalo; preservar escolha em backup.

## 5. Especificação das análises

### 5.1 Navegação e filtros

Resumo: placar, posse observada, finalizações, no alvo, gols, xG, xT, pressão enfrentada/superada e cobertura. Análise: abas **Mapa**, **Pressão e resposta**, **Finalizações**, **Construção**, **Caminhos da posse** (Markov). Reutilizar layout e primitivas visuais, sem passar futebol pelo motor semântico de vôlei.

Filtros comuns: equipe, atleta, período, intervalo de tempo, ação, resultado, pressão e posse. Em Pressão e resposta/Caminhos da posse, dar destaque a **equipe que pressiona, equipe pressionada, estrutura de saída, bloco e tipo de pressão**, em vez de escondê-los como detalhes avançados. Construir sequências sobre o histórico íntegro antes de selecionar: nunca criar uma conexão artificial juntando eventos que sobraram após filtrar. Diferenciar “eventos correspondentes” e “posses que contêm eventos correspondentes”. Mostrar contagem elegível e excluída em cada visual.

### 5.2 Mapas reais

- Ações: pontos no campo com símbolos por ação/resultado, tooltip com tempo/equipe/atleta/pressão e acesso à sequência.
- Trajetórias: setas exclusivamente entre origem e destino do mesmo passe/condução; não ligar pontos de ações diferentes. Origem/destino incompletos não formam seta.
- Calor: grade inicial 12×8 com contagem de origens; legenda com unidade e escala. Rotular **densidade de ações registradas**, pois não há tracking/ocupação contínua. Permitir normalização percentual explícita; comparação entre equipes usa mesma escala.
- Finalizações: posição e resultado; quando há xG, área do marcador proporcional ao valor. Chutes sem xG permanecem visíveis com símbolo próprio. Mapa agregado de soma de xG por zona, não apenas quantidade de chutes.
- Perdas/recuperações: controles específicos sobre a camada de ações. Posições ausentes aparecem na cobertura, nunca no centro do campo.
- Campo preserva proporção 120×80. Camada e hit testing usam a mesma transformação. Seleção por teclado e tabela equivalente para leitura acessível.

### 5.2.1 Onde pressionam e como respondemos — entrega central

O painel começa com **“Verde pressionando Azul”**, com troca de perspectiva explícita. Campo analítico orientado pelo ataque da equipe pressionada; mostrar essa referência, pois “alto” do defensor corresponde a região próxima à saída do adversário. Não misturar orientações na comparação espacial.

Oferecer três camadas distintas, nunca chamar todas de “intensidade”:

1. **Volume:** ações da equipe com bola qualificadas sob pressão por zona, com contagem e cobertura. A zona é a posição observada da bola/ação pressionada; não representa coordenadas de todos os defensores.
2. **Incidência:** ações sob pressão / ações com situação de pressão conhecida na mesma zona. “Não observado” fica fora do denominador e aparece na cobertura. Isso separa pressão frequente de simples volume de circulação da bola.
3. **Resposta:** setas das ações sob pressão, destinos e cores para manutenção/perda/superação confirmada, com legenda que distingue essas propriedades. Selecionar uma zona abre episódios e caminhos até progressão, área, finalização, xG e xT.

Contagem de **episódios iniciados por zona** é outro modo, com unidade explícita: três passes pressionados no mesmo episódio são três ações, um episódio e uma posse. Não somar episódios completos em cada zona visitada como se fossem novas pressões. Duração só aparece quando início/fim e cobertura forem observados. Se só existe tag na ação, oferecer mapa de ações sob pressão, sem afirmar um mapa completo de toda a pressão exercida sem bola.

Tabela de resposta: método (passe/condução/drible/bola longa/duelo), direção, estrutura de saída, tipo de pressão, ações/episódios elegíveis, manutenção de controle, superação confirmada, perda, chegada ao último terço, área, chutes, xG associado e ΔxT. Permitir abrir a evidência de cada célula.

Denominadores obrigatórios:

- Manutenção/perda **imediata**: ações pressionadas com controle posterior conhecido; disputa é categoria separada, não perda confirmada.
- Superação de pressão: episódios com resultado de superação conhecido; mostrar separadamente quantos terminaram por interrupção e quantos são censurados.
- Progressão/finalização **posterior**: posses distintas expostas à pressão no recorte, com trecho posterior observado até o desfecho; explicitar esse horizonte. Cada posse entra uma vez na taxa, mesmo com vários episódios. Exibir incompletas separadamente.
- Pressão pós-perda: perdas com reação observada. Recuperação subsequente e tempo até recuperar exigem sequência contínua; sem continuidade, desconhecido. Não presumir contrapressão por proximidade temporal sem a reação observada.

Para xG posterior à pressão, mostrar duas leituras: (a) xG em posses que enfrentaram pressão, contando cada chute uma vez no total da coorte; (b) atribuição ao último episódio elegível anterior ao chute na mesma posse, com política explícita de rebote/continuidade. Não copiar o mesmo xG integral para cada episódio. ΔxT das ações pressionadas usa os IDs únicos das progressões elegíveis; xT final da posse segue separado.

Fixture de aceite: zona Z com 10 ações de pressão conhecida (6 sob pressão, 4 livres), mais 5 sem observação: incidência 60% (6/10), cobertura 10/15. Três das seis ações pertencem ao mesmo episódio: continuam três ações e um episódio. Inverter a perspectiva equipe/ataque reposiciona o desenho, sem mudar os totais. Em 4 posses completas expostas, 2 chegam a chute: 50% (2/4); dois chutes em uma delas não elevam o numerador para três posses.

### 5.3 Métricas e denominadores

| Métrica | Definição de implementação |
|---|---|
| Finalizações | Quantidade de eventos de chute após correções/desfazimentos, mesmo sem posição |
| No alvo | No subconjunto local: Gol + Defendida; Bloqueada/Fora/Trave excluídas. Documentar regra e adaptar importações por resultado suportado |
| Posse temporal observada A | `tempoControladoA / (tempoControladoA + tempoControladoB)`; excluir disputa/parada/desconhecido/pausa e exibir esses tempos separadamente |
| Cobertura temporal | Tempo efetivamente observado / tempo do jogo no recorte; nunca estimar a partir da quantidade de eventos |
| Posses registradas | Contagem de segmentos; não rotular como porcentagem de tempo |
| xG | Soma de probabilidades elegíveis de finalização, separadas por fonte/modelo; ausente é indisponível, não zero |
| xT criado | Soma de diferenças `V(destino)-V(origem)` das progressões elegíveis que mantêm controle; manter negativos |
| xT na última progressão | `V(destino)` da última progressão elegível da posse; representa nível final de ameaça, não ganho somado |

Sem intervalos confiáveis, cartão de posse temporal mostra “Cobertura temporal insuficiente” e oferece contagem de posses. Em uma observação parcial confiável, exibir percentuais explicitamente restritos ao período observado. Não extrapolar o tempo entre dois cliques como domínio ininterrupto da bola.

### 5.4 xG: implementação honesta e completa

Primeiro suportar valor importado com proveniência e mostrar mapas/agrupamentos sobre esse valor. Para registros locais, criar um modelo versionado offline: selecionar dados reais suficientes, fixar origem/IDs/hashes/licença, transformar coordenadas, treinar por script reproduzível e exportar coeficientes/metadados para inferência local. A fixture de `reference/` só valida integração e não serve para treino ou calibração.

Baseline recomendado: regressão logística com distância e ângulo de abertura da baliza; acrescentar parte do corpo e tipo de chute somente com contrato e dados disponíveis. Converter a malha 120×80 para dimensão física declarada (ex.: padrão do modelo 105×68 m), sem chamar unidades da malha de metros. Separar treino/validação por partida, não por chute; registrar Brier score, log loss, curva de calibração e comparação com baseline de frequência. Escolha de corpus e desempenho são parte obrigatória da etapa, não coeficientes inventados pelo implementador.

Pré-chute xG não usa resultado, posição final da bola, força percebida ou informação posterior como preditor. Pressão só entra se treinada com semântica compatível; não multiplicar xG por um fator manual. Caso o modelo exija uma informação ausente, aplicar política documentada do modelo ou devolver indisponível. Não apresentar o modelo local como equivalente ao da StatsBomb.

Contrato de estimativa: `{eventId, value?, modelId, modelVersion, source, eligible, missingReasons}`. Inferência em módulo puro; artefato carregado localmente; cache invalidado por revisão da partida, orientação e versão de modelo. Operação durante jogo independe de rede.

### 5.5 Quais ações geraram mais xG e xT

Separar três leituras, com nomes explícitos:

1. **xG dos chutes** por localização, atleta, equipe e contexto.
2. **xG após a última ação criadora**: para cada chute, vincular no máximo a última progressão observada da mesma equipe/posse, sem lacuna ou reinício entre ela e o chute. Agrupar por passe/condução/drible elegível e origem da ação. Mostrar também “sem ação criadora identificada”. É associação observada, não efeito causal. Um chute não é atribuído integralmente a todas as ações anteriores. Rebote sem nova criação não ganha vínculo automático com a ação anterior ao primeiro chute.
3. **xT criado nas progressões**: somar ganhos por ação/atleta/zona; mostrar origem, destino, valor inicial, final e diferença no detalhe. Para a primeira versão, passe completo e condução com controle mantido; drible só entra com origem/destino observados e política de sucesso explícita.

Por posse, exibir soma xG dos chutes, soma ΔxT das progressões e xT na última progressão em colunas distintas. Não somar xG e xT em um “total de perigo” sem modelo específico. Soma de xG de vários chutes não é automaticamente probabilidade de gol da posse.

Restaurar também **origem → desenvolvimento → desfecho**: recuperação alta/média/baixa (zona normalizada), tiro de meta, saída estruturada, outras reposições; número de passes, distância das conduções, pressão enfrentada/superada, quebra de linha e recepção entrelinhas. “Transição” é desenvolvimento, não categoria de origem mutuamente exclusiva com recuperação. Comparar xG/posse e chegada à área por essas dimensões sem somar grupos sobrepostos. Mostrar participação dos atletas (na construção, na recuperação ou na recepção) como recortes associativos; não concluir que uma substituição causou mudança. “Condução longa” requer limiar e unidade versionados; exibir também distância contínua e não converter unidades 120×80 diretamente em metros.

xT requer grade de valores treinada e versionada em corpus suficiente. Pode ser produzida com pipeline offline próprio ou biblioteca de referência; navegador apenas consulta o artefato. Exigir modelo/grade compatíveis com orientação e coordenadas. Perda não recebe `-V(origem)` sob o nome xT padrão; se desejado no futuro, criar métrica distinta e documentada. Sem artefato real, estado indisponível é provisório e a etapa de xT permanece incompleta.

### 5.6 Markov

O protagonista é **Caminhos da posse**, restaurando a pergunta original: “dada uma saída 3+1 e a pressão enfrentada, como a posse se desenvolve?”. Implementar perfis separados, sem cruzar todas as dimensões em uma matriz esparsa gigante:

1. **Caminho tático geral:** saída/construção → progressão → último terço → área → finalização, com perda/interrupção e retornos observados; definir regras versionadas de estados e evidências. Entrada na área exige trajetória/observação de entrada, não só chute localizado nela.
2. **Condicionado por saída e oposição:** comparar 3+1/3+2/outras observadas e pressão individual/coletiva, altura de bloco, zona e método de resposta. Estrutura não observada é grupo próprio, não baseline implícito.
3. **Caminhos de resposta à pressão:** pressão enfrentada → resposta por passe/condução/bola longa → superação confirmada/quebra de linha/entrelinhas → progressão ou perda → desfecho. Caminho detalhado pode ser árvore de sequências; não chamar toda probabilidade condicional de transição Markov de um passo.

Exemplos de saída: `P(finalização | saída 3+1 observada)` e `P(último terço | 3+1 + pressão coletiva + superação observada)`, sempre com X/Y posses elegíveis, incompletas e baseline comparável. Mostrar diferença em pontos percentuais e, se baseline >0, razão de frequências; evitar linguagem de efeito causal. Estruturas/pressão subjetiva sem equivalência externa usam apenas dados locais. Não usar um modelo treinado em futebol profissional para fabricar o efeito de 3+1.

Uma cadeia descritiva espacial de 9 estados (3 terços × 3 corredores) pode ser visão complementar, não substituto dessa entrega. Cada posse gera sequência de localizações observadas, colapsando duplicações apenas quando representam o mesmo limite entre ações, sem apagar auto-transições reais. Definir testes para origem→destino e encadeamento entre ações; não contar uma mesma movimentação duas vezes. Para tática de corredores, preservar ala/meio-espaço/centro: criar perfil com 5 corredores (limites explícitos em y), sem alterar retroativamente a função legada de 3 corredores. Área é região geométrica, não uma faixa longitudinal inteira; não tratar o esboço antigo de 25 macrozonas como geometria já validada.

Transição deve pertencer à mesma equipe, período, posse e trecho observado. Não atravessar lacuna, mudança de controle, parada ou filtro. Para essa cadeia, finalização encerra a sequência analítica; rebote observado inicia outra subsequência mesmo se continuar na mesma posse esportiva. Ausência de próximo evento é censura, não perda.

`Nij = número de transições observadas i→j`; `Pij = Nij / soma_j Nij`. Linha sem observação fica sem estimativa; terminais conhecidos podem ter auto-transição 1 por definição. Essas são probabilidades de **próxima transição**. Já `P(finalização | 3+1)` é proporção de **posses distintas que alcançam o desfecho** (não somar visitas repetidas): não reutilizar o denominador de transições. Para o perfil de progressão da referência F5, contar primeira passagem elegível por posse/estado e documentar a unidade; não misturar com todas as visitas do perfil espacial. Exibir grafo com espessura proporcional a probabilidade, número absoluto, matriz e lista de sequências de origem. Limitar grafo a transições selecionadas sem alterar matriz/denominadores. Sinalizar baixo N; não afirmar precisão com base em uma partida.

Motor xT é separado: pode usar cadeia espacial mais fina e probabilidades de movimento/finalização/gol do corpus de treino. Não reutilizar a cadeia de 9 zonas como modelo xT sem treino/validação. Comparação com referência só quando estados, unidade de contagem, orientação e cobertura forem compatíveis. No `compareMarkov`, validar alpha não negativo/finito, contagens finitas/não negativas e totais maiores que zero; impedir NaN e incompatibilidade escondida. `alpha=10` legado não é calibração universal.

## 6. Etapas executáveis

Cada etapa termina executável, com relatório de arquivos alterados, validação e limitações. Não considerar componente desconectado como entrega. Novos arquivos abaixo são sugestões de responsabilidade, não arquivos já existentes.

### T0 — Fixar baseline e corrigir contrato (primeiro)

Editar `StatsBombContract.ts`, `FootballRecorder.ts`, `FootballAnalytics.ts`, `ScoutTrainerService.ts`, testes e documentação de compatibilidade. Criar leitor central de outcome e tipos de eventos suportados (shot/dribble/duel), validação compartilhada, IDs estáveis e preservação de campos na correção. Registrar estado inicial de git e comandos de teste. Incluir partidas antigas, importados sem extensão e gol criado pelo próprio gravador nas fixtures.

Aceite: gol salvo entra nas métricas, correção de drible mantém resultado, trocar ação no editor não cria outro evento, round-trip preserva extensões e eventos de vôlei. Não ampliar UI ainda.

### T1 — Controle, estado tático, pressão, tempo e orientação (depende T0)

Editar `FootballPossessionService.ts`, `FootballRecorder.ts`, `MatchEvent.ts`, `MatchMetadata.ts`, `ScoutTrainerService.ts`, `MatchJson.ts`. Criar projetor de controle/intervalos, eventos de reinício/cobertura e serviço de orientação. Garantir desfazer/corrigir/refazer projeção após reabrir. Definir novo contrato e migração não destrutiva em documento próprio. Implementar também `FootballTacticalState.ts`, `FootballPressureEpisode.ts` e `FootballTacticalQuestions.ts`, incluindo vínculo da oposição/resposta aos trechos da posse, política de herança e censura da seção 4.

Aceite: posse A→disputa→B; passe incompleto com manutenção de A; parada→reinício A cria segmento novo; gol→parada; 2º tempo; pausa de observação; correção retroativa e desfazer restauram controle e durações. Intervalos conhecidos A=30s e B=10s resultam 75%/25%, independentemente de 20s adicionais sem controle. Jogos antigos não recebem essa porcentagem artificialmente.

### T2 — Registro visual (depende T1)

Editar `FootballScoutScreen.tsx`, `FootballActionPanel.tsx`, `FootballContextDrawer.tsx`, `FootballShotPanel.tsx`, CSS de futebol, regras específicas em `app.css`, `GestureCourtInput.tsx` se necessário e integração no `App.tsx`.

Criar `FootballControlBar.tsx`, `FootballPressureControl.tsx`, `FootballDraftSummary.tsx` e `useFootballDraft.ts` (ou reducer equivalente). Unificar editor de chute. Conectar toda entrada ao contrato persistido. Adicionar `FootballTacticalQuestion.tsx` e `FootballPossessionStrip.tsx`: perguntas por gatilho, saída em diagramas, bloco, pressão, superação e reação pós-perda. Manter apenas detalhes secundários colapsados; contexto vigente e pergunta pertinente ficam visíveis. Implementar geometria editável visível, seleção por identidade, reset da pressão pontual e continuidade explícita de episódio, além do estado pendente de salvamento.

Aceite: operador registra sequência de 10 ações sem reabrir contexto repetido; pressão sobrevive a recarga/correção; erro mantém rascunho; duplo clique salva uma vez; cancelamento não muda posse; passe completo pode avançar receptor identificado. Verificar viewports e teclado descritos na seção 3 com screenshots de antes/depois. Manter gesto do vôlei funcionando. Testar saída 3+1 persistida na posse sem reapresentar pergunta em todo passe, troca de bloco no meio da posse, pressão coletiva encerrada por superação, passe tocado sem domínio e reação pós-perda atribuída à equipe que perdeu, não à nova equipe com bola.

### T3 — Navegação, resumo e mapas (depende T0/T1; integrar após T2)

Editar `App.tsx` e `FootballAnalyticsPanel.tsx`. Criar `FootballSummaryScreen.tsx`, `FootballAnalysisScreen.tsx`, `FootballPitchPlot.tsx` e camada de mapas em `src/ui/screens/summary/football/`; criar `FootballMetrics.ts` e `FootballPressureAnalytics.ts` no domínio. Incluir `FootballPressureResponsePanel.tsx`, volume/incidência/respostas por zona e acesso aos episódios conforme seção 5.2.1; essa análise não pode ficar adiada como simples filtro. Extrair/reutilizar geometria de `FootballCourtSurface.tsx` sem acoplar interação de captura ao gráfico. Avaliar `HeatmapLayer.tsx` existente apenas como primitiva visual; não importar semântica de quadra de vôlei.

Aceite: análise acessível pela navegação da partida; pontos/setas/células efetivamente renderizados e interativos; totais batem com fixture após filtros; chutes sem posição contam no resumo e na exclusão do mapa; filtro não cria trajetória; pressão altera recorte; desfazer e recarregar atualizam gráficos. Estados vazio/sem coordenadas/sem orientação diferentes. Executar a fixture de incidência/cobertura da seção 5.2.1; validar um episódio com várias ações sem duplicação de posse e resposta desconhecida sem virar fracasso.

### T4 — Finalizações, xG e atribuição (depende T3)

Criar `FootballXgModel.ts`, `FootballChanceAttribution.ts`, painel de finalizações e artefatos/pipeline em `reference/football-models/` e `scripts/football-models/`. Adaptar importação e relatório sem sobrescrever `raw`. Implementar xG importado primeiro; realizar treino/validação offline do modelo local e anexar ficha do modelo. Criar ranking por zona e ação criadora.

Aceite: todos os chutes continuam contados; cobertura xG exibida; sem orientação não gera valor local; chutes idênticos sob mesma versão geram mesmo valor; soma de mapa/ranking coincide com eventos elegíveis; atribuição não duplica chutes e separa rebotes. Não concluir modelo local apenas exibindo “indisponível”; se corpus faltar, registrar dependência concreta e seguir partes independentes.

### T5 — xT e construção (depende T4 para pipeline; usa T1/T3)

Criar `FootballXtModel.ts`, painel de construção e grade treinada/documentada. Mostrar ranking de ΔxT por tipo/atleta/zona, mapa de origem e destino de ameaça e tabela por posse com xG, ΔxT e valor final separados.

Aceite determinístico com grade de teste: movimento 0,02→0,08 produz +0,06; movimento 0,08→0,03 produz −0,05; passe incompleto e destino ausente são excluídos com motivo. Grade fictícia é exclusiva de teste. Artefato real precisa ter fonte, versão, dimensão e avaliação documentadas. Reabrir partida preserva resultados para a mesma versão.

### T6 — Markov visual (depende T1/T3; pode preceder T4/T5 se dados de modelo demorarem)

Criar `FootballMarkovAnalyzer.ts`, `FootballMarkovPanel.tsx`, `FootballTacticalPathBuilder.ts`, extrator de sequências e testes. Entregar caminhos táticos gerais, comparação 3+1/3+2 e recortes de oposição/resposta; nove zonas são apenas visão complementar. Endurecer `FootballReferenceMarkov.ts`. Adaptar `FootballReferenceReport.ts` somente com dados efetivamente calculados. Reaproveitar renderizadores genéricos existentes se não exigirem regras de vôlei.

Aceite: fixture com 3 transições i→j e 1 i→k exibe 75%/25%, N=4; matriz/grafo batem; sequência interrompida não produz aresta; zero observações não produz NaN; mudança de pressão/filtro preserva denominador documentado; comparação incompatível é rotulada sem mistura. Fixture tática: 4 posses completas em 3+1 com 2 finalizações versus 4 em 3+2 com 1 finalização mostram 50% (2/4) versus 25% (1/4), diferença de 25 p.p.; visitas repetidas aos estados não mudam esses denominadores. Abertura da célula mostra as posses que sustentam o número. Um episódio coletivo com três passes não vira três posses pressionadas.

### T7 — Integração final e validação operacional (depende todas)

Atualizar testes de integração `football-recording-cycle.test.ts`, fluxos E2E de futebol em `e2e/recovery-stage*.spec.ts`, testes JSON, telas e relatório de entrega. Uma partida de teste deve conter passes, perda, disputa, recuperação, parada, dois chutes na mesma posse, pressão diferente entre ações, gol, correção, desfazer e mudança de período.

Rodar testes focados durante cada etapa; ao final `npm run typecheck`, `npm run build`, `npm test`, `npm run lint` e E2E pertinentes. Separar falhas pré-existentes das novas com evidência; não declarar sucesso sem comando concluído. Não atualizar expectativas apenas para legitimar comportamento errado.

Aceite final: registrar→recarregar→analisar→exportar backup→importar mantém eventos, controle, pressão, geometria e métricas. Verificar isolamento de partidas e modalidades. Medir tempo mediano de registro em pelo menos 20 ações guiadas e comparar ao baseline; documentar erros de equipe/posse e ações que exigiram rolagem. Essa medição valida a proposta de UX; não inventar ganho percentual.

## 7. Ordem de prioridade e critérios de entrega

Ordem principal: T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7. T6 pode ser antecipada após T3. Entrega funcional prioritária: registro de controle/pressão e mapas reais até T3; restante continua parte do escopo, com status explícito. Não usar previsão de prazo rígida antes do baseline e da seleção de corpus.

Não redesenhar vôlei, trocar persistência, introduzir backend de inferência nem reimplementar biblioteca de gráficos como pré-requisito. Não alimentar modelos estatísticos com a fixture pequena. Não chamar “posse”, “xG” ou “xT” a uma contagem substituta sem identificação clara.

## 8. Prompt pronto para Terra

> Leia `docs/versoes/v0.4/futebol/PLANO_REDESIGN_FUTEBOL_TERRA.md` e inspecione o checkout atual, incluindo alterações ainda não commitadas. Implemente as etapas T0–T7 na ordem de dependência, mantendo o aplicativo executável a cada etapa. Comece corrigindo contratos/projeção antes do redesign; conecte todos os componentes às rotas e à persistência. Preserve o trabalho existente e a modalidade vôlei. Crie `docs/versoes/v0.4/futebol/base-f1-f5/ESTADO_REDESIGN_TERRA.md` com status, arquivos, decisões, comandos efetivamente executados e pendências de cada etapa. Use os critérios de aceite e as definições de posse, pressão, orientação, xG, xT e Markov deste plano, revisão 2. O núcleo é posse → estado tático → oposição → resposta → desfecho: não reduza pressão a booleano, não substitua caminhos táticos por uma matriz espacial e não esconda saída 3+1/3+2, quebra de linha ou reação pós-perda em campos desconectados. Entregue mapa de incidência de pressão e respostas por zona já em T3; em T6 entregue probabilidades condicionadas pela estrutura e oposição com denominadores de posses. Para modelos locais, produza pipeline e artefatos verificáveis; não invente coeficientes nem use fixture como treinamento. Se corpus ou ambiente impedir uma parte, registre o impedimento específico e avance nas etapas independentes. Não considere placeholders, componentes não montados ou testes não concluídos como entrega. Ao final, apresente resultados da validação e limitações restantes.

## 9. Referências metodológicas verificadas

- [Socceraction — ExpectedThreat](https://socceraction.readthedocs.io/en/latest/api/generated/socceraction.xthreat.ExpectedThreat.html): xT espacial avalia a diferença de valor entre origem e destino.
- [Socceraction — rate](https://socceraction.readthedocs.io/en/latest/api/generated/methods/socceraction.xthreat.ExpectedThreat.rate.html): aplicar a ações que movem a bola mantendo posse; base para a política de elegibilidade proposta.
- [Hudl — Upgrading Expected Goals](https://www.hudl.com/blog/upgrading-expected-goals): distingue qualidade da oportunidade de execução posterior do chute; fundamenta a separação entre xG pré-chute e força/alvo final.

As escolhas de interface, grade de visualização, estados Markov e baseline local são propostas deste plano. As fontes não validam previamente esse produto ou seus futuros modelos.
