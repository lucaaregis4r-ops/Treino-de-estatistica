> **Versão/escopo:** Base do app 0.4.0; pacote Futebol 0.1 (numeração própria do módulo).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../../COMECE_AQUI.md).

# Scout Trainer Futebol 0.1 — contrato geral e roteiro para Luna

Lucas Regis · revisão de 19/09/2026

## Decisão de produto

Futebol entra **na mesma pasta/repositório e na mesma aplicação** do Scout Trainer de vôlei. Reaproveitar a quadra gestual funcional (Pointer Events, geometria, transformação de coordenadas, feedback, correção, responsividade) e trocar apenas o desenho/medidas do campo. O registro permanece local, rápido, híbrido entre botões visuais e gestos. Uma pessoa registra ações relevantes e posses; não rastrear os 22 jogadores nem exigir todos os passes. Sem reformulação da identidade visual existente.

**Formato de futebol:** eventos com nomenclatura, tipos/IDs, blocos específicos, coordenadas e regras semânticas da [especificação oficial StatsBomb Open Data Events v4.0.0](https://github.com/hudl/open-data/blob/master/doc/Open%20Data%20Events%20v4.0.0.pdf), conferida também contra um [arquivo oficial de eventos da partida 15946](https://github.com/hudl/open-data/blob/master/data/events/15946.json). Não chamar a saída do Scout Trainer de “dados oficiais StatsBomb”: é coleta própria compatível com o esquema. O formato nativo do app preserva o mesmo núcleo e inclui uma extensão `scout_trainer` para dados nossos. Exportação de eventos StatsBomb e importação do Open Data usam adaptadores explícitos. Eventos parciais conservam ausências; o relatório de exportação aponta incompatibilidades, sem fabricar localização, atleta, posse, xG ou outros campos.

### Fonte de verdade e fontes de referência

- Antes de editar, ler `AGENTS.md`, o checkout **local**, a implementação real da quadra gestual, modelo canônico, persistência, relatórios e `ESTADO.md`. Os nomes `SpatialCourtInputV2`, `TacticalCourt` e `courtGeometry` apareceram em documentação anterior; confirmar se existem hoje. Não sobrescrever mudanças locais.
- A documentação StatsBomb citada define a interoperabilidade. Os dados abertos de partidas, distribuídos como JSON em [hudl/open-data](https://github.com/hudl/open-data), servem a **fixtures de conversão** e a **referências estatísticas identificadas**, sempre com origem, competição/temporada/partidas, versão do recorte, cobertura, denominador e condições de uso atribuídas. Não misturar partidas públicas e partidas coletadas como se tivessem a mesma cobertura de eventos.
- Bibliotecas como [mplsoccer](https://mplsoccer.readthedocs.io/en/latest/gallery/pitch_setup/plot_pitch_types.html), [kloppy](https://kloppy.pysport.org/examples/transformations/) e [socceraction/SPADL](https://socceraction.readthedocs.io/en/latest/documentation/spadl/spadl.html) são referências/possíveis ferramentas offline de conversão e pesquisa. A UI Electron/PWA continua no stack atual; não instalar Python para desenhar o campo ou captar gestos.

## Contrato de coordenadas

O campo da StatsBomb usa `location: [x,y]` em **0–120 × 0–80**; o topo esquerdo da vista orientada da equipe é `(0,0)`, e a equipe do evento ataca para `x=120`. Essa escala é de dados, não 120 × 80 metros reais. `pass.end_location` e `carry.end_location` são `[x,y]`; `shot.end_location` pode ser `[x,y]` ou `[x,y,z]`. Na baliza, a referência documentada é `x=120`, traves próximas de `y=36` e `44`, travessão `z=2,67` no desenho da fonte. Não reduzir a mini-baliza a uma coordenada bidimensional se a altura for conhecida; se só lateralidade for observada, guardar altura ausente. Nunca converter força percebida em z ou velocidade medida.

O capturador compartilhado pode operar em `[0,1]`, mas o evento canônico **salvo** para futebol usa os campos/escala StatsBomb. Uma única função `pointer → coordenada normalizada → StatsBomb` e sua inversa suportam desenho, gravação e importação. Definir na partida a orientação física das equipes por período; o campo da UI pode espelhar para manter coerência visual, enquanto coordenadas do evento correspondem à perspectiva da equipe do evento. Ao importar dados StatsBomb sem lado físico conhecido, mostrar orientação analítica e marcar lado físico como desconhecido; não adivinhar troca de campo. Posição não observada fica ausente. Distância/ângulo só são derivados quando início e fim são confiáveis; `pass.length` da especificação é em jardas, não em unidades 120 × 80. Para uso em metros físicos é necessário conhecer medidas reais do campo.

## Contrato de evento e posse

Usar UUIDs estáveis, `index` crescente **na partida inteira**, `period`, `timestamp` no formato `HH:MM:SS.mmm` relativo ao período, `minute` e `second` conforme convenção StatsBomb, `type:{id,name}`, `team:{id,name}` quando conhecida, `player` opcional, `possession` numérica sequencial da partida, `possession_team:{id,name}` do controle da posse, `play_pattern` somente quando conhecido/derivável com regra declarada, `location` apenas se observada e bloco específico (`pass`, `carry`, `shot`, `duel`, `interception`, `ball_receipt`, etc.). `team` do evento pode ser adversário de `possession_team`, como num desarme/interceptação antes de controle estabelecido. Não atribuir automaticamente posse ao defensor quando só houve desvio/duelo.

Guardar dados que a StatsBomb não cobre sob `scout_trainer`, versionados e com proveniência: modalidade, ID interno da partida/posse, sequência de captura, saída `3+1`/`3+2`, pressão qualitativa, quebra de linha observada, vantagem, percepção de força, controle após toque, notas e cobertura. Ao exportar para StatsBomb puro, remover só essa extensão mediante opção explícita e acompanhar de um **manifesto de perda** (quais campos/quantos eventos ficaram fora). Exportação completa do Scout Trainer mantém a extensão e é preferida para backup e reimportação sem perda. Eventos Open Data importados preservam `raw`/campos desconhecidos e seus IDs para exportação sem perda semântica; editar um deles invalida apenas a cópia raw daquele evento e refaz sua serialização com aviso.

**Posse:** a definição da StatsBomb é período de controle estabelecido de uma equipe; eventos defensivos adversários podem aparecer na posse corrente. Uma reposição após bola fora cria posse nova mesmo se a equipe não mudou. Nos lances incertos, mostrar `controle pendente` e permitir correção, sem afirmar troca. `play_pattern` é contexto de origem (From Corner, Free Kick, Throw In, Goal Kick, Keeper, Kick Off etc.); não criar “From Counter” só porque a UI marcou transição: a fonte usa regra própria de cadeia de posse que não foi implementada aqui. A comparação entre recortes precisa declarar origem e cobertura.

### Mapa da captura híbrida para eventos StatsBomb

| Botão/observação | Tipo padrão | Detalhe e regra de mapeamento |
| --- | --- | --- |
| Passe | `Pass` 30 | Origem `location`, destino `pass.end_location`; `pass.outcome` omitido se chegou ao colega e status comprovado, `Incomplete` 9 se não chegou e segue em campo, `Out` 75 se saiu, `Unknown` 77 se interrupção no voo e esse fato foi observado. Destinatário/altura só se conhecidos. |
| Recepção | `Ball Receipt*` 42 | Gerada **da mesma interação**, somente quando houve tentativa de recepção observada com localização e equipe; relacionar ao passe por `related_events`. Recepção incompleta: `ball_receipt.outcome:{id:9,name:'Incomplete'}`. Se recepção sem domínio não foi observada com segurança, manter informação local e avisar que exportação pura não a representa. Não gerar recepção para todo passe por inferência. |
| Erro de domínio | `Miscontrol` 38 | Evento distinto apenas se toque ruim/perda de controle foi observado; não converter toda recepção incompleta em Miscontrol. |
| Condução / drible | `Carry` 43 / `Dribble` 14 | Deslocamento controlado = Carry com `carry.end_location`; enfrentamento para superar defensor = Dribble com outcome observado. Uma condução não vira Dribble automaticamente. |
| Recuperação, interceptação, desarme | `Ball Recovery` 2 / `Interception` 10 / `Duel` 4 | Interception só corta um passe; desarme em disputa contra portador é Duel com subtipo tackle e outcome observado, não um tipo `Tackle` inventado. Recuperação de bola solta = Ball Recovery. Defesa sem direção; ponto opcional. |
| Perda | `Dispossessed` 3 / `Miscontrol` 38 | Dispossessed exige desarme por adversário sem tentativa de drible; Miscontrol é toque ruim. “Perda” sem causa específica conserva tipo genérico na extensão até qualificação; não atribuir um dos dois por chute. |
| Chute | `Shot` 16 | `shot.type`, `shot.outcome`, `shot.body_part` quando conhecidos. Origem e destino `[x,y]` ou `[x,y,z]` somente observados. `statsbomb_xg` só existe em evento importado que de fato o contém; não copiar xG público para chute novo. |
| Falta / bola parada / gol contra | `Foul Committed` 22, `Foul Won` 21, passe com `pass.type`, `Own Goal Against` 20 / `Own Goal For` 25 | Foul Won só quando vencedor da falta conhecido; a reposição é uma posse nova. Gol contra exige evento próprio e placar coerente, sem criar chute do beneficiário. |

**Passe tocado mas não dominado:** o fluxo pergunta `Dominou? Sim / Tocou sem dominar / Interceptado / Saiu / Não observado`. Se `Tocou sem dominar`, perguntar `Quem ficou com a bola? mesma equipe / adversário / bola fora / indefinido`. Guardar as respostas locais; emitir `Pass`, `Ball Receipt*` incompleta e eventualmente `Miscontrol` **apenas nos casos observados que satisfazem suas definições**. A ausência de `pass.outcome` no esquema StatsBomb só representa sucesso quando isso foi observado; em coleta parcial não usar ausência como afirmação de sucesso — manter status local desconhecido e sinalizar exportação como parcial. Corrigir o passe ajusta eventos derivados relacionados/placar/posse de forma determinística, sem IDs órfãos.

## Parâmetros que virão dos dados públicos StatsBomb

**Primeira versão:** um recorte reproduzível de partidas públicas serve para (1) validar importação de eventos e cálculo espacial; (2) construir **taxas de referência observadas** de chutes por zona, tipo e parte do corpo, com gols/chutes e tamanho da amostra; (3) comparar **frequências de progressão de posse** somente em transições cujas definições e cobertura coincidam. Guardar uma pequena tabela derivada versionada + manifesto (IDs das partidas, temporada/competição, seleção, regras, contagens); não instalar/embutir uma liga inteira ou baixar dados durante o scout ao vivo. A tabela é **referência externa**, nunca verdade estatística sobre a partida do usuário. Fonte e atribuição na tela/relatório.

**Parâmetros de Markov com referência externa:** na F5, para estados/desfechos rigorosamente iguais e amostras com cobertura adequada, transformar as contagens públicas numa distribuição inicial por estado e atualizá-la com as posses locais. Mostrar lado a lado `referência StatsBomb`, `observado no Scout Trainer` e `estimativa combinada`, com numeradores, denominadores, peso do referencial e método. O peso deve ser fixado/documentado após avaliação de sensibilidade ou validação, não escolhido para deixar o gráfico convincente. Sem referência comparável, mostrar apenas contagens locais e a referência separada. Saída `3+1`, pressão subjetiva e quebra de linha observada não recebem um parâmetro StatsBomb artificial.

**Fora desta versão:** afirmar xG StatsBomb para chutes próprios, imitar OBV, estimar força/PSxG a partir do alvo, transferir taxas de uma liga profissional para jogos locais sem avisar, inferir saída 3+1/pressão/linha quebrada de partidas públicas se esses qualificadores não estiverem presentes. Se houver `shot.statsbomb_xg` num evento **importado**, exibir como campo recebido da StatsBomb com essa proveniência; para scout manual, mostrar contagens/taxas históricas com rótulo correto. Um modelo próprio calibrado e validado pode ser uma etapa futura.

## Etapas: um arquivo e um pedido por vez

| Etapa | Arquivo | Entrega principal |
| --- | --- | --- |
| F1 | `Scout_Trainer_Futebol_F1_Base_StatsBomb.md` | Esquema canônico, modalidade, relógio, quadra compartilhada e orientação. |
| F2 | `Scout_Trainer_Futebol_F2_Registro_StatsBomb.md` | Posse e registro ação → gesto condicional → qualificador; recepção incompleta e correções. |
| F3 | `Scout_Trainer_Futebol_F3_Contexto_Chutes.md` | Contexto tático extra e chute/mini-baliza com mapeamento fiel. |
| F4 | `Scout_Trainer_Futebol_F4_Leitura.md` | Campo analítico, filtros e origem das posses perigosas com denominadores. |
| F5 | `Scout_Trainer_Futebol_F5_Intercambio_Referencias.md` | Import/export Open Data com round-trip, referência StatsBomb derivada, transições e relatório. |

Colocar este plano e os cinco arquivos em `docs/versoes/v0.4/futebol/base-f1-f5/` dentro do checkout local, após conferir `AGENTS.md`. Cada etapa deixa o app executável, atualiza `ESTADO.md`, informa testes e próxima etapa. Os caminhos de código surgem da inspeção do checkout. Não abrir cinco frentes num único prompt. **O texto copiável está ao final de cada arquivo F1–F5.**
