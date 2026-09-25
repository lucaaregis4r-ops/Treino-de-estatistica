> **Versão/escopo:** Fundação histórica; release não declarado.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Contexto do projeto

## Propósito

O Scout Trainer será uma plataforma leve de treinamento de operadores de scout de voleibol. Ela
deve permitir digitação contínua, interpretação por perfis configuráveis, registro local de
partidas, reconstrução determinística do estado e produção de estatísticas.

O produto é uma combinação de motor de scout, plataforma de treino e sistema configurável de
códigos. Não é um clone de software comercial nem uma integração oficial com uma competição.

## Princípios que orientam a implementação

- Local-first e offline-first, sem envio de partidas a serviços externos.
- Domínio independente de React, DOM, IndexedDB e APIs externas.
- Texto digitado e significado esportivo são conceitos diferentes.
- Eventos canônicos e imutáveis são a fonte de verdade.
- Profiles de código, complexidade, competição e treino permanecem separados.
- Estatísticas são calculadas por módulos de domínio, nunca por componentes visuais.
- Cada fase termina com testes, lint, typecheck, build e atualização do status.
- Funcionalidades de fases futuras não são antecipadas.

## Contextos conceituais

- `ProfileContext`: define como uma sessão interpreta e valida entradas.
- `MatchContext`: contém a situação corrente da partida.
- `ScoutContext`: acompanha rally, evento anterior e sequência.
- `TrainingContext`: identifica sessão, profile, exercício e tempo inicial.

Esses contratos serão criados apenas quando suas fases autorizarem a implementação.

## Roadmap completo

O acompanhamento operacional usa oito macroetapas. As fases 0–22 do documento mestre continuam
como checklist técnico dentro delas. Consulte `docs/ROADMAP.md` para escopo e critérios.

## Estado desta entrega

As oito macroetapas estão implementadas. O produto inclui scout, estatísticas, treino, exportações
JSON/CSV/TXT, CodeProfiles editáveis e persistentes, distribuição PWA, recuperação por replay,
migração do banco, restauração atômica de backups validados, suporte testado a partidas com 5.000
eventos e validação E2E em Chrome. O plano mestre está concluído; novas entregas são evolução.

A Evolução V2 está em andamento. A macroetapa 9 está concluída: o resultado terminal do rally agora
é a fonte auditável do placar, saque e rotação; elenco, líbero da partida, escalação P1–P6 e funções
táticas por slot são explícitos; substituições preservam o papel do slot; e o fim de set obedece a
regras configuráveis. A macroetapa 10 também está concluída: o fluxo aceita códigos concatenados,
detecta fronteiras pelo `CodeProfile` e registra o último evento após uma curta ociosidade, sem Enter
obrigatório e sem criar um segundo parser. A macroetapa 11 também está concluída: campos bloqueantes,
recomendados, opcionais e derivados são classificados separadamente; eventos válidos podem ser
persistidos como parciais; e detalhes posteriores usam correção auditável com undo/redo/replay. A
macroetapa 12 também está concluída: localizações, trajetórias, perfis de zonas e metadados
especializados por fundamento usam um envelope V2; direções derivadas obedecem regras do perfil;
dicionários de chamadas e combinações são configuráveis; e a migração IndexedDB v3 mantém campos
V1 legíveis enquanto acrescenta a representação V2. A macroetapa 13 também está concluída: uma
projeção pura sobre a timeline efetiva deriva fase de rally, equipe sacadora, posição rotacional do
levantador, recepção associada ao ataque e próxima ação esperada. Correções, undo, resultado terminal
e replay recompõem o mesmo contexto sem persistir eventos sintéticos. A macroetapa 14 também está
concluída: `CodeProfile.tacticalInput` configura prefixos, aliases, zonas e atalhos; o Quick Tactical
Editor aplica todos os detalhes sem retirar definitivamente o foco do scout; e a quadra permite
selecionar zonas ou desenhar trajetórias com coordenadas normalizadas. O caminho completo permanece
operável somente pelo teclado. A macroetapa 15 também está concluída: 24 métricas auditáveis cobrem
saque, recepção, ataque, distribuição do levantador, sideout, breakpoint e transição; cada resultado
preserva numerador, denominador, componentes e recortes. A UI apenas formata esses resultados em
matrizes de zonas, mapas de direção e tabelas filtráveis. A macroetapa 16 também está concluída:
treinos táticos cobrem oito famílias, inclusive rallies completos digitados continuamente; métricas
do operador separam precisão, velocidade, completude, correção e detalhamento tático; e os fluxos de
robustez cobrem undo/redo, reload, migração, exportação/restauração JSON, analytics e 5.000 eventos.
Com isso, todas as macroetapas 9–16 da Evolução V2 estão concluídas.

A evolução de portabilidade local também está concluída. O usuário pode autorizar uma pasta e, sob
demanda, criar um pacote independente nomeado pelas equipes e data/hora. O pacote contém o JSON
restaurável, scouts CSV, códigos TXT e placar CSV de todos os sets. O IndexedDB continua sendo a fonte
ao vivo; nenhuma pasta recebe escrita automática. A área Livre persiste texto arbitrário em uma store
isolada, sem reutilizar parser, placar ou regras de partida.

O PWA usa cache versionado apenas em produção. Durante o desenvolvimento local, resíduos de service
workers e do app shell são removidos automaticamente, sem limpar o IndexedDB, evitando que uma versão
antiga da interface tente abrir um schema de banco mais novo.

O treino aprofundado passou a exigir detalhes efetivamente digitados, com tutorial embutido por
fundamento. A captura segue o princípio “observado, não presumido”: zonas desconhecidas ficam ausentes;
trajetória é derivada somente quando origem e destino existem; e referências de função tática orientam
os ataques (central em 3, oposto em 2 e ponteiro em 4) sem impedir exceções explícitas.

A captura operacional mantém uma linha visual contínua: códigos detectados continuam no campo,
enquanto apenas o trecho final incompleto alimenta o buffer do parser. Enter não separa ações; serve
somente para forçar a análise do trecho atual. Uma aba Manual documenta fundamentos, símbolos de
avaliação, detalhes táticos e exemplos do profile compacto padrão. O manual separa explicitamente
Scout ao vivo, Treino e Livre; inclui anatomia do código, mapa de zonas, referência por função,
rally completo, dicionário de tokens e diagnóstico de cada erro. A referência também detalha os
qualificadores por fundamento e dedica uma seção ao saque, com tipo observado, origem, destino e
exemplos como `*08S+O1T1` para um saque da zona 1 à zona 1.

No treino, uma ação única sem sufixos vai diretamente ao parser canônico, portanto um núcleo como
`02A=` nunca é rejeitado pelo enquadrador de linha contínua. Quando faltam detalhes, o feedback
mostra a resposta completa e o token exato de cada ajuste, sem rótulos genéricos. Uma tentativa
incorreta permanece no mesmo exercício; somente um acerto avança a sessão.

Novas partidas oferecem `Data Volley` como linguagem padrão da interface. O profile implementa o
núcleo público básico `equipe + jogador + fundamento + avaliação`: `*` identifica a equipe da casa
e `a` a visitante, por exemplo `*08S#` e `a12R+`. O profile compacto anterior continua disponível
para arquivos e fluxos já existentes. Códigos táticos internos permanecem declarados como recursos
do treino, sem alegar equivalência com a sintaxe avançada proprietária do Data Volley.

O modelo de quadra indoor separa posição de rotação e trajetória. As posições regulamentares são
P1–P6: 4–3–2 junto à rede e 5–6–1 no fundo. Origem e destino são capturados em dois meios-campos
espelhados de uma quadra 18×9 m, com rede e linhas de ataque a 3 m. O `DirectionResolver` classifica
paralela, diagonal ou centro quando o par de zonas permite derivação; o operador ainda pode omitir
uma origem desconhecida, informar a direção ou desenhar coordenadas precisas. P7–P9 não são tratadas
como posições de rotação.

O scout contínuo aceita enriquecimento tático no mesmo trecho, sem espaço: `*01S!YHT5` é enquadrado
como um único evento (`*01S!`) com tipo `H` e destino `5`. Perfis com detalhes táticos não confirmam
mais o núcleo por tempo ocioso. Um prefixo inequívoco de nova equipe/jogador fecha o evento anterior;
Enter fecha o último evento da linha. Assim, pausas do operador não destacam o sufixo do contato.
Ao final de cada ponto, a UI pode pré-escrever o próximo sacador usando a equipe sacadora e o atleta
em P1 após a rotação. Apenas o núcleo `equipe + NN + S` é sugerido quando o profile inclui equipe;
avaliação, tipo e trajetória nunca são
inferidos por essa automação.

## Fontes de verdade

1. `SCOUT_TRAINER_IMPLEMENTATION_PLAN.md`: especificação arquitetural e funcional.
2. `IMPLEMENTATION_STATUS.md`: progresso, checks, decisões e pendências.
3. `docs/architecture/PIPELINES.md`: limites e fluxo de dados entre módulos.
4. ADRs futuros em `docs/decisions/`: decisões arquiteturais duráveis.
5. `docs/ROADMAP.md`: agrupamento operacional em oito macroetapas.
6. `docs/SCOUT_TRAINER_EVOLUTION_V2_2.md`: plano das macroetapas de evolução 9–16.
7. `docs/SCOUT_TRAINER_EVOLUTION_V3_ANALYTICS.md`: auditoria e contratos canônicos da V3.
8. `../../docs/SCOUT_TRAINER_V0.3_PLANO_IMPLEMENTACAO.md`: plano das macroetapas 17–21.

## Estado da Evolução V3

A Macro 17 está concluída e não adicionou funcionalidade ao produto. A versão continua `0.2.0`.
Foram auditados o pipeline digitado, o evento canônico, o contexto tático derivado, a quadra com
coordenadas normalizadas, analytics/reporting e IndexedDB v4.

As entregas então pendentes eram analytics avançado, visual analytics, scout visual/híbrido,
analytics espacial e histórico multi-partida. Nenhum evento sintético de levantamento será criado;
ataques e lineup vigente fornecem o contexto do levantador. Nenhuma funcionalidade de vídeo
pertence a essa evolução.

### Macro 18 — Analytics avançado

A Macro 18 está concluída. Expected Sideout e Expected Breakpoint aceitam referências empíricas
explícitas e ficam indisponíveis quando a amostra não cobre as avaliações observadas. Attack
Evenness compara distribuição observada e esperada sem tratar maior valor como qualidade universal.
Setter Repetition e Setter Attack Conversion usam ataques e o levantador derivado pelo contexto
tático, sem exigir o scout de todo levantamento. O mesmo bloco avançado alimenta report model, CSV e
PDF.

### Macro 19 — Visual Analytics

A Macro 19 está concluída. O resumo apresenta gráficos Recharts para performance geral, rotações,
distribuição do levantador, uniformidade e repetição. Todo gráfico possui equivalente textual e
tabular auditável sobre o mesmo `MatchReportModel`; a UI não recalcula métricas de domínio.

Scout visual/híbrido, analytics espacial e histórico continuam pendentes.
