> **Versão/escopo:** Base do app 0.4.0; pacote Futebol 0.1 (numeração própria do módulo).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../../COMECE_AQUI.md).

# F4 — Leitura espacial e origem das posses

**Leia primeiro:** `AGENTS.md`, plano geral, F1–F3 e `ESTADO.md`. **Executar apenas F4.** Trabalhar em seletores puros sobre eventos canônicos e posses; a UI nunca reescreve dados ao aplicar filtros.

## Tela de leitura

Manter tema e navegação do Scout Trainer. Abrir com equipe, período, quantidade de posses completas/incompletas e campo proporcional. Oferecer modos exclusivos: **Ações** (pontos/eventos), **Trajetórias** (passes/carries com origem/destino registrados) e **Densidade** (frequência, nunca eficácia). Reutilizar desenho, adaptador de coordenadas e cores/controle visual já implementados. Filtros: equipe, período, tipo de evento StatsBomb, saída observada `3+1`/`3+2`, `play_pattern`, origem da posse, pressão local, zona, progressão e desfecho. Filtrar depois de construir cada posse, preservando todos os seus eventos no detalhe; não produzir transições fictícias pulando ações ocultas.

Exibir `X de Y eventos têm posição`; evento sem localização entra nas contagens mas não recebe ponto fabricado. Atacar sempre para a direita em vista analítica por equipe, com orientação mostrada; vista física simultânea de dois times só quando período/lado físico for conhecido. Sobreposição de marcadores abre lista, sem deslocar coordenadas originais. Uma marca/indicador abre sequência editável com IDs/ordem e qualificadores realmente registrados.

## Indicadores e posses perigosas

- Separar unidade **evento**, **chute** e **posse**. Ex.: quatro passes da mesma posse não são quatro posses; dois chutes na mesma posse contam dois chutes e uma posse com chute.
- Indicadores com numerador/denominador: início por recuperação/bola parada/saída, entrada no último terço/área, progressão por passe versus condução, finalizações por posse, gols por chute. Mostrar elegibilidade, incompletos e “Sem dados” quando denominador zero.
- “Posses perigosas” tem um critério selecionável de cada vez: `entrou na área`, `teve finalização` ou `teve gol`. Agrupar por origem e zona de início; abrir a lista de posses usadas. Uma posse pode satisfazer mais de um critério, mas nunca é somada duas vezes na mesma taxa. A definição da zona vem de coordenadas observadas e regra declarada. Se uma posse sem trajetória só registra chute, ela entra nos critérios correspondentes, não em uma entrada de área inferida sem dado.
- Separar resultado do passe (`pass.outcome`) de domínio na recepção (`ball_receipt.outcome` e extensão). `Pass` sem outcome **não é contado como completo** se o Scout marcou “não observado”. Contagem de desarme (`Duel.type=Tackle`), interceptação e recuperação preserva suas diferenças; não somar eventos defensivos duplicados no mesmo lance como posses novas.

**Estatística de referência da StatsBomb ainda não entra aqui**; F5 adiciona um recorte público versionado, mantendo apartada a análise da partida. Se uma importação de partida pública já existir, seus eventos podem usar estes seletores desde que campos/identidade sejam preservados.

## Verificações obrigatórias

- Dados de exemplo com uma posse contendo vários passes e dois chutes; uma segunda posse da mesma equipe após lateral; um passe de recepção incompleta; evento sem coordenadas e uma posse ainda aberta. Conferir contagens manualmente.
- Filtro `3+1` mantém estrutura da posse ao abrir sua evidência; filtro de um tipo de evento não reconecta arbitrariamente primeiro e último evento como transição consecutiva.
- Marcadores renderizados em ambas as orientações, pontos no limite do campo, alvo de chute `[x,y,z]` sem projetar `z` no gramado; densidade mostra frequência e cobre apenas posições válidas.

## Prompt para Luna

> Leia `AGENTS.md`, plano geral, F1–F3, este F4 e `ESTADO.md`. Execute somente F4: seletores puros, campo em ações/trajetórias/densidade, filtros e origem das posses perigosas com definição/denominador explícitos e drill-down à sequência original. Respeite o esquema StatsBomb, evento parcial e orientação; não una ações separadas por filtro nem duplique posses. Teste os cenários deste arquivo, atualize `ESTADO.md` e não faça F5.
