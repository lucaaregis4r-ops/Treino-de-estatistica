> **Atualização de interface:** a composição e a ordem de trabalho desta referência foram substituídas pela [M5 revisada](etapas/M5_REGISTRO_POR_POSSE.md). Contexto tático detalhado fica na revisão; R4 permite captura opcional de uma categoria por vez, sem formulário permanente. Consultar este documento pelos fundamentos de dados; não reconstruir os painéis antigos a partir dele.

> **Versão/escopo:** 0.5 proposta — versão de planejamento, não release.
> **Classificação:** Referência conceitual do plano vigente. Executar pelas macroetapas, não por este documento isolado.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Proposta: scout de futebol por posse e marcos espaciais

Data: 21/09/2026. Status: proposta de produto e implementação; não implementada.

## 1. Decisão proposta

Criar um modo adicional **Por posse**, preservando o registro detalhado atual. A unidade principal passa a ser a posse; dentro dela registramos posições observadas da bola, mudanças relevantes de contexto, perdas e finalizações. Passes e conduções individuais deixam de ser obrigatórios.

Premissa inicial: um operador acompanhando o jogo em tempo real, com mouse/toque e atalhos. Vídeo, quando disponível, serve à revisão posterior; o funcionamento básico não pode depender dele.

O objetivo é responder: onde recuperamos, por onde avançamos, até onde chegamos, sob qual pressão, como terminamos e quais finalizações produzimos ou concedemos. O critério de sucesso é acompanhar o jogo sem acumular registros atrasados.

## 2. Limite da inferência

- Dois pontos da bola permitem descrever deslocamento entre observações, não identificar passe, condução, quantidade de toques ou trajetória física.
- Jogador A seguido de B identifica dois portadores observados. Pode ter havido outros jogadores e ações entre eles; não criar automaticamente um passe A → B.
- Mesmo jogador em dois pontos não comprova condução: ele pode ter passado e recebido novamente.
- Uma transferência vista diretamente pode ser registrada como passe opcional, com ação própria. Não é requisito do modo nem base para uma taxa de acerto geral.
- Não reconstruir passes fictícios para alimentar análises ou exportações antigas. Ausente significa não observado, não zero.

## 3. Contrato de coleta

### Núcleo prioritário

1. Equipe com controle e momento de início/troca, ou estado disputa/parada/desconhecido.
2. Localização no começo observado, nos marcos relevantes e no desfecho, quando visível.
3. Desfecho da posse: controle adversário, parada, gol, fim de período ou observação interrompida.
4. Finalizações: momento, equipe, origem, resultado e autor quando identificado.

Perder um campo não deve impedir capturar o acontecimento. Disponibilizar posição, autor e resultado desconhecidos e indicar pendências de revisão. Um chute incompleto é preferível a um chute omitido.

### Contexto útil, sem formulário obrigatório

- Pressão: não observada, livre, sob pressão. Individual/coletiva e superação são detalhes opcionais.
- Saída: curta/apoiada, direta/longa, mista, não observada; estrutura 3+1, 3+2 etc. em campo separado e opcional.
- Distinguir saída desde trás, transição após recuperação e bola parada. Uma recuperação alta não é automaticamente uma saída de bola.
- Atleta com a bola: opcional e válido naquele registro. Próxima posição sem identificação não herda o nome anterior como fato.
- Perda: ação associada e atleta envolvido quando vistos. Não atribuir culpa automaticamente ao último portador identificado.

### Quando marcar posição

Marcar início/retomada, chegada controlada a outro terço ou corredor relevante, entrada na área, recuo importante, mudança de pressão e desfecho. Não exigir clique a cada passe, toque, segundo ou pequena mudança espacial.

Usar terços e três corredores como referência visual inicial, com área destacada; manter coordenada aproximada e precisão da marcação. Uma bola longa sobrevoando o último terço não comprova acesso controlado a esse terço. Uma ligação entre pontos não prova passagem controlada por todas as zonas intermediárias.

Se mesmo esse protocolo atrasar o operador, reduzir primeiro a granularidade espacial e os detalhes táticos. Priorizar mudanças de controle, perdas e finalizações. Não resolver sobrecarga acrescentando mais automações que inventem observações.

## 4. Interação proposta

Campo grande, marcador persistente da última posição observada, cor/nome da equipe, relógio, direção de ataque e cinco estados: equipe A, equipe B, disputa, parada, desconhecido. Fora da linha principal: histórico, correção, exportação e detalhes táticos.

| Intenção | Operação principal | Efeito |
|---|---|---|
| Iniciar controle observado | Escolher equipe + tocar no campo | Abre posse ou trecho parcial e salva posição/momento |
| Atualizar bola | Um toque no campo | Salva marco na posse atual, sem escolher ação ou confirmar formulário |
| Registrar troca conhecida | Atalho de troca + toque na nova posição | Encerra posse anterior e abre a próxima em uma operação lógica |
| Registrar perda ainda sem novo controle | Perda + toque | Registra local observado e coloca bola em disputa ou estado desconhecido, conforme observação |
| Registrar parada | Botão/atalho parada | Encerra segmento e suspende contagem de controle, preservando relógio de jogo |
| Registrar chute | Atalho finalização + origem + resultado | Salva chute; detalhes ficam disponíveis sem bloquear o acompanhamento |
| Corrigir engano | Desfazer ou editar item recente | Recalcula posses e indicadores dependentes |

Atalhos exatos devem ser definidos no protótipo para evitar conflitos. O toque é o padrão; arraste curto pode ser alternativa, mas nunca exigir perseguir a bola continuamente com mouse ou dedo. Movimento do ponteiro sem ação explícita não registra dados.

Mostrar a idade do marcador: “última posição observada há 7 s”. A trilha opcional conecta observações com linha tracejada e não anima movimento presumido. Mostrar apenas poucos pontos recentes durante a coleta; sequência inteira na revisão.

O horário deve ser capturado na primeira intenção explícita do operador, antes dos detalhes. Salvar posição, controle e desfecho relacionados de forma atômica e desfazível. Se o salvamento falhar, manter indicação de pendência e não apresentar o registro como concluído.

Uma perda pode receber detalhes em cartão pequeno, dispensável, vinculado ao lance original enquanto a nova posse já está sendo acompanhada. Nunca bloquear um novo chute porque o cartão anterior ficou aberto.

## 5. Regras que evitam distorções

- **Controle e disputa:** toque adversário, desvio ou tentativa de desarme não confirmam nova posse. Troca exige controle adversário observado.
- **Posse e intervalos:** uma cadeia pode conter intervalo de disputa e retomada pela mesma equipe; esse intervalo não entra no tempo de controle. Se o adversário controlar, a posse muda.
- **Parada:** termina o segmento. Reinício abre outro, mesmo com a mesma equipe; ligação entre segmentos pode preservar contexto da sequência ofensiva sem fundi-los.
- **Chute:** é evento dentro da posse, não necessariamente seu fim. Rebote pode gerar outro chute na mesma posse; defesa com controle, bola fora e gol têm consequências diferentes.
- **Perda e recuperação:** uma mesma troca não conta duas vezes. Ação causadora e ponto de novo controle podem ocorrer em posições distintas.
- **Dois locais da perda:** em passe interceptado, distinguir origem da tentativa e local da interceptação. Se só o segundo foi visto, o primeiro permanece desconhecido. Mapas devem nomear qual ponto exibem.
- **Responsabilidade:** separar autor do passe, receptor pretendido e atleta desarmado quando conhecidos. “Último jogador visto” não significa “responsável pelo erro”.
- **Pressão:** snapshot pontual por padrão. Acompanhamento de episódio é opção explícita; encerrar/resetar em troca, parada, lacuna ou período. Livre e não observado não são equivalentes.
- **Saída:** pertence ao trecho de construção observado; pode mudar. Não copiar automaticamente para outra posse.
- **Cobertura:** começo perdido, fim perdido e intervalo sem observação tornam a posse parcial. Retomar coleta não inventa o que ocorreu na lacuna.
- **Relógios:** suspender a coleta não pausa o jogo. Bola fora também não deve parar automaticamente o relógio corrido do futebol.
- **Orientação:** manter campo estável para o operador; normalizar direção de ataque por equipe/período nas análises.

## 6. Finalizações com prioridade

Captura rápida: equipe e tempo, posição de origem, resultado (gol, defendida, bloqueada, fora, trave ou não observado) e autor identificado quando possível. Resultado e controle posterior são coisas distintas; oferecer sequência imediata mantém/disputa/adversário/parada.

Detalhamento posterior: pé/cabeça/outra parte, bola parada ou jogo corrido, de primeira, assistência observada e posição do alvo quando vista. Força percebida não é prioridade para esta mudança.

O modelo local de xG existente usa geometria de origem e orientação. Preservar identificação de modelo/fonte e cobertura, sem tratar a estimativa como validação da qualidade do novo protocolo. Melhorar ou calibrar xG é uma etapa separada; não condicionar o modo de posse a isso.

## 7. Análises compatíveis

| Pergunta | Indicador proposto | Condição/limite |
|---|---|---|
| Onde ganhamos e perdemos controle? | Mapas de início e término por posse | Cobertura espacial explícita; não misturar origem do erro e recuperação adversária |
| Conseguimos avançar? | Posses com chegada controlada observada a cada terço/área; máxima zona observada | Uma contagem por posse e zona; falta de marcação não prova ausência de chegada |
| Por onde construímos? | Sequências observadas de zonas/corredores | Não são rotas exatas nem redes de passes |
| Quais posses produzem chutes? | Posses com ≥1 chute / posses elegíveis; chutes por posse | Separar posses completas/parciais e rebotes |
| Como respondemos à pressão? | Perdas, manutenção e chutes por episódio/posse exposta | Pressão conhecida; associação não demonstra causa |
| A saída 3+1 ou direta funciona? | Desfechos das construções com contexto conhecido | Comparar mesmo tipo de fase, mostrar N e evitar dupla contagem |
| Uma perda gera perigo? | Chutes na posse adversária imediatamente seguinte | Só com continuidade observada; é vínculo temporal |
| Quanto tempo controlamos? | Tempo de A e B nos intervalos acompanhados | Mostrar disputa, parada e lacunas separadamente; não extrapolar ao jogo inteiro |
| Quem aparece nas perdas/chutes? | Contagens de ações identificadas | Sem taxa individual de erro quando faltam toques/tentativas como denominador |

Evitar inicialmente: acerto e volume total de passes, redes de passe, distância conduzida, velocidade real da bola, posse territorial por tempo, PPDA e crédito individual por progressões intermediárias não vistas.

Mapa de cliques mede observações e sofre influência da frequência de registro. Preferir mapa de **possessões com presença observada por zona**, com uma contagem por posse/zona. Ainda assim apresentar cobertura; não chamar isso de tempo de ocupação.

Percentual de posse temporal só é elegível se mudanças de controle forem acompanhadas continuamente, ainda que posições sejam esparsas. Denominador do percentual A/B: tempo controlado conhecido; cobertura temporal deve aparecer ao lado.

Não reaproveitar automaticamente ΔxT de passe/condução para ligações entre marcos. Eventual valor territorial entre posições precisa de definição própria. Cadeias de Markov devem representar transições entre estados observados e não ações intermediárias reconstruídas; mudanças na frequência de coleta mudam suas contagens.

## 8. Aproveitamento do código atual

Inspeção em 21/09/2026:

- `src/ui/screens/scout/football/FootballScoutScreen.tsx`: já oferece estados de controle, cobertura, pressão e chute, mas exige selecionar ação antes de habilitar campo; formulário ainda é centrado em eventos.
- `src/domain/football/FootballObservation.ts`: `BallControl` e `projectControl` são bases úteis. A projeção exclui observações tipo 1000 da lista de eventos da posse; novos marcos precisam entrar explicitamente no modelo consultado pelas análises.
- `src/application/ScoutTrainerService.ts`: `observeFootballControl` salva observação local tipo 1000, hoje sem posição e com horário obtido ao chamar o serviço. Estender o contrato com marco espacial e tempo de captura; não codificar observação como passe.
- `src/ui/screens/scout/FootballCourtSurface.tsx`: superfície pode receber marcador persistente e trilha da posse, além da geometria temporária de ação.
- `src/domain/football/FootballPressureEpisode.ts`: reaproveitar conceitos de episódio, revendo gatilhos para observações espaciais.
- `src/domain/football/FootballMarkovAnalyzer.ts`: estados espaciais hoje dependem de destino de passe/condução; adaptar extrator para marcos sem inventar ações.
- `src/domain/football/FootballModels.ts`: ΔxT depende de passe/condução observados; manter elegibilidade distinta. Chutes existentes continuam eventos reais.
- `src/ui/screens/summary/FootballAnalyticsPanel.tsx`: trocar foco de volume de ações para posse, progressão observada, desfecho e cobertura no novo modo.

Contrato mínimo sugerido: modo/protocolo de coleta versionado; marco com ID, período, tempo de captura, equipe/controle, localização e precisão, atleta opcional; mudança de contexto; desfecho e evidências; referências a chutes reais. Posses são derivadas de histórico corrigível, sem contadores paralelos mantidos pela tela.

Distinguir completude temporal, espacial e contextual. Uma posse pode ter começo/fim conhecidos, mas poucos marcos ou pressão desconhecida. Um único booleano não basta para decidir todas as métricas.

Backup local preserva tudo. Exportação StatsBomb inclui apenas eventos reais compatíveis; novos marcos e posses permanecem em extensão/formato local documentado. Não inventar passes para satisfazer o esquema externo. Atualizar validação e versionamento de intercâmbio antes de habilitar a nova gravação.

## 9. Entrega em etapas

### Etapa 1 — Protótipo do fluxo mínimo

Modo Por posse junto do Detalhado; campo clicável sem ação prévia; marcador persistente; equipe/disputa/parada/desconhecido; troca com posição; perda e chute rápido; desfazer; captura de horário e lacunas. Aproveitar persistência e orientação atuais. Não ampliar painéis analíticos nesta etapa.

Critérios: um toque para atualizar posição; troca conhecida em até duas interações principais; detalhes nunca bloqueiam nova observação; chute pode ser salvo incompleto e corrigido; perder/reiniciar/recarregar não apaga posição e estado confirmado.

### Etapa 2 — Piloto operacional antes de ampliar

Usar 10–15 minutos de vídeo em velocidade normal, contendo circulação, transições, perdas, paradas e chutes. Coletar sem pausar; depois revisar o trecho com pausas como referência. Se a primeira rodada ensinar o trecho, usar outro trecho comparável na rodada seguinte para reduzir efeito de memorização.

Medir ações de interface por minuto/posse, atraso de mudanças de controle/chutes, episódios perdidos, correções e proporção de posses com início/fim/marcos observados. Metas provisórias: nenhum chute omitido no trecho e nenhuma fila persistente de registros; ajustar limites de atraso com evidência do piloto, sem prometer precisão antes de medir.

Se falhar, reduzir exigências antes de criar novas métricas. O piloto avalia viabilidade, não valida sozinho a precisão estatística para todas as partidas.

### Etapa 3 — Contexto tático de baixo custo

Adicionar pressão livre/sob pressão/desconhecida por trecho, saída observada por construção e detalhes opcionais de perda. Confirmar no piloto que isso não piora a cobertura de perdas e chutes.

### Etapa 4 — Análises por posse

Entregar mapas de início/perda/chute, progressão observada por zona, posses com chute, sequência após perda e cruzamentos de pressão/saída. Todo percentual mostra denominador, casos desconhecidos e cobertura. Manter métricas de ações detalhadas apenas nos dados compatíveis.

### Etapa 5 — Revisão e refinamentos

Linha do tempo para completar autoria e contexto em pausas ou pós-jogo; sincronização com vídeo se houver fonte disponível. Só considerar sugestões de transferências entre atletas depois de validar dados e utilidade, mantendo inferências separadas de eventos observados.

## 10. Verificação necessária na implementação

Testar transição A → disputa → A/B, perda seguida de recuperação sem dupla contagem, parada/reinício pela mesma equipe, chute/rebote/segundo chute, lacuna de observação, começo parcial, troca de período/orientação, correção antiga com reprojeção e desfazer atômico. Validar backup novo/antigo e exportação sem marcos falsamente convertidos em passes.

Checar uso em 1366×768, 1024×768 e toque: campo e controles essenciais visíveis, ausência de formulário bloqueante, falhas de salvamento identificáveis. Esses testes verificam o software; o piloto verifica se o operador consegue usá-lo.

## 11. Referências conceituais

- FIFA, [Possession control](https://www.fifatrainingcentre.com/en/fwc2022/efi-metrics/efi-metric--possession-control.php): distingue tempo de posse das equipes e bola em disputa. Sustenta separar disputa de controle; as regras operacionais deste documento são propostas para o aplicativo.
- Hudl StatsBomb, [Using StatsBomb 360 Data As A Performance Analyst](https://blogarchive.statsbomb.com/articles/soccer/using-statsbomb-360-data-as-a-performance-analyst/): contextualiza o valor de posições defensivas para analisar quebra de linhas e recepção em espaço. Coordenadas esparsas da bola não fornecem esse contexto por si sós.
