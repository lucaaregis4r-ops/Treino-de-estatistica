# Estado atual observado no repositório

Referência: branch `main`, 14/09/2026.

## O que já está pronto e deve ser preservado

### Produto
- React + TypeScript + Vite.
- Electron para desktop.
- PWA/local-first.
- Persistência em IndexedDB.
- `package.json` atual em `0.4.0`.

### Registro
- Digitado, Visual, Híbrido e Gestual.
- Eventos convergem para histórico canônico.
- Origem/destino espacial.
- Contexto de placar, set, equipe, rotação, levantador e rally.
- Gestual com Pointer Events.
- Registro sem atleta já aparece no domínio atual.
- Cobertura parcial da partida já possui tipos em `ScoutEvent` (`both`, `team_a`, `team_b`).
- Correção, desfazer/refazer e replay.

### Analytics
- Saque, recepção e ataque.
- Sideout e breakpoint.
- Distribuição do levantador.
- Métricas por rotação/posição.
- Analytics espacial.
- Heatmap.
- Probabilidade estimada de set/partida.
- Análises/filtros salvos e seleção de gráficos para relatório aparecem na revisão atual.

### Implicação espacial para 0.45
- O Scout já possui origem/destino espacial e analytics espacial; a 0.45 deve **reutilizar** esse sistema de coordenadas.
- `x,y` passa a ser entrada formal de analytics, não somente visualização.
- O estado Markov permanece pequeno; região/célula/trajetória entram como contexto.
- A implementação deve distinguir coordenada ausente de `(0,0)` e preservar a versão do sistema de zonas/coordenadas.
- O primeiro caso tático prioritário é **destino da recepção/passe -> probabilidade de sideout/rally win**; depois saque por destino e ataque por origem/destino/trajetória.

### Arquitetura útil para 0.45
- `ScoutEvent` possui `rallyId`, `sequence`, `teamId`, `skill`, `outcome`, `evaluation`, `setNumber`, `scoreBefore`, contexto de lineup e metadados.
- `TacticalRallyProjection` já organiza contatos/rallies.
- `MatchAnalyticsService` já é o agregador de analytics de partida.
- `StatisticsEngine` e métricas avançadas já existem.
- Analytics é derivado dos eventos; essa regra deve continuar.
- Existe `WinProbabilityService`; Markov não deve duplicar essa responsabilidade.

## Dívidas conhecidas da 0.4 que afetam a 0.45

A U7 não certificou a suíte inteira:
- placar repetido no Resumo;
- AppFlow possui expectativas antigas;
- parte do `critical-flow` usa navegação/rótulos antigos;
- Alt+T em input tem comportamento funcional pendente;
- lint global ainda possui erros legados;
- textos de análise sem coordenadas ainda podem ser ambíguos;
- rodapé do PDF ainda carrega versão antiga em evidência da U7;
- avisos de Recharts em abas ocultas.

A 0.45 começa fechando apenas as dívidas que podem contaminar a nova camada analítica. Não transformar o M0 em faxina geral.

## Estado atualizado após a implementação do plano Luna Markov

- Motor de caminhos Markov de primeira ordem em `src/domain/analytics/markov/RallyPathAnalyzer.ts`.
- Estados compostos por equipe, fundamento e qualidade, com terminais de ponto por equipe.
- Potencial calculado por absorção; frequência observada de rallies vencidos permanece separada.
- Prefixos do fluxo e filtros são derivados de contatos reais; sem multiplicação de probabilidades para inventar ocorrências.
- Explorador `Caminhos do rally` integrado à tela de análise, com fluxo responsivo, quadra proporcional, comparações por qualidade, evidências e tabelas técnicas recolhidas.

O que continua fora do escopo desta entrega:

- registro novo, migração de banco ou alteração de schema;
- modelo de segunda ordem e contagens simuladas;
- vídeo, IA generativa e expansão para outros esportes.

## Decisão arquitetural da 0.45

A fonte da verdade permanece:

`ScoutEvent -> projeção de rally -> analytics determinístico -> visualização/exportação`

A IA entra depois:

`analytics determinístico -> DTO reduzido -> provider BYOK -> explicação`

Nunca:

`eventos -> LLM -> estatística`
