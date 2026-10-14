# M2 — modalidade e quadra própria de futsal

**Objetivo:** criar e abrir partidas de futsal com a quadra correta. **Depende de:** M0–M1. **Próxima:** M3.

**Estado desta rodada:** fluxo de modalidade, quadra, orientação e backup implementados; typecheck passou. Inspeção visual ainda pendente.

## Entradas reais

`MatchSport.ts`, `MatchMetadata.ts`, `NewMatchScreen.tsx`, `App.tsx`, `MatchesScreen.tsx`, registros de equipes/atletas, `GestureCourtInput.tsx`, `FootballCourtSurface.tsx`, `FootballPitchPlot.tsx`, `CourtGeometry.ts`, `MatchJson.ts`.

## Implementação

1. Expor **Futsal** como terceira opção de modalidade na criação, listagem, filtros, cabeçalho, registro, resumo e backup. Equipes e atletas cadastrados precisam de modalidade correta; equipes legadas sem modalidade pedem confirmação explícita. Não forçar escalação inicial para começar scout coletivo.
2. Criar `FutsalCourtSurface` próprio com proporção de quadra, linha central, círculo, áreas de 6 m, marcas de 6/10 m, escanteios e balizas. Evitar copiar o desenho de futebol e trocar só o título. Usar um componente visual único do futsal no registro e mapas futuros.
3. Reusar captura por clique/toque/teclado de `GestureCourtInput` adaptando `sport` e a superfície. Guardar coordenadas normalizadas `[0,1]²` e direção de ataque por equipe/período; inverter apenas apresentação. Se a dimensão real da quadra não foi cadastrada, não exibir distância em metros.
4. Criar tela de futsal básica com cabeçalho/quadra e estado vazio explícito, pronta para receber relógio e scout nas etapas seguintes. Não montar automaticamente análises, exportação StatsBomb ou `FootballMinimalScoutScreen` como se a partida fosse futebol.
5. Backup/reabertura: `sport='futsal'` é preservado, sem mudar resolução de partidas antigas de futebol/vôlei ou campo ausente.

### Feito nesta rodada

- Futsal entrou em criação, cadastro de equipe/atleta, histórico e filtro de modalidade. Reutilizar equipe ou atleta legado sem modalidade exige confirmação explícita e não altera o cadastro salvo.
- A partida grava `sport='futsal'`, inicia sem escalação inicial e abre uma tela própria. Os painéis de análise de futebol e de vôlei não são usados para essa modalidade.
- `FutsalCourtSurface` é um desenho independente em proporção nominal 40:20: linhas de fundo/laterais, meio-campo, círculo central, áreas de 6 m, marca de pênalti, marca de 10 m, referências de distância e arcos de canto. As dimensões oficiais variam por competição; o desenho não afirma as dimensões do local e a interface não converte coordenadas em metros.
- `GestureCourtInput` reconhece futsal e conecta o domínio espacial à superfície própria. A tela desta etapa a mantém desabilitada com estado vazio explícito; o registro persistente de fatos entra na M4.
- Orientação de ataque é persistida por equipe e período e começa como não observada.
- Backup passou para 1.3.0, declara `scout-trainer-futsal-facts-0.6` como contrato da modalidade e aceita importação de 1.2.0, além de 1.0.0 e 1.1.0.
- O traçado da quadra segue a Lei 1 das [Leis de Futsal FIFA 2025–26](https://www.tff.org/Resources/TFF/Documents/MHK/2025-2026/futsal-laws-of-the-game.pdf), que permite faixas de dimensões por competição e especifica as áreas e marcas da quadra.

## Aceite e verificação

- Criar, fechar, reabrir e filtrar partida de cada modalidade; futsal mantém a sua quadra.
- Pontos nos quatro cantos e centro persistem com mesma coordenada canônica após inversão e reload.
- Inspeção visual em 1366×768 e 390×844; quadra, balizas e marca de 10 m legíveis; sem overflow.
- Pendente nesta rodada: testes de modalidade/backup e regressão dirigida de futebol/vôlei; lint dirigido e inspeção visual desktop/celular.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M2. Implemente somente M2:
terceira modalidade e quadra real de futsal, com persistência e navegação.
Reaproveite a captura normalizada, preservando o desenho e os dados das
outras modalidades. Faça inspeção visual desktop/celular. Relate testes,
arquivos e riscos; não inicie M3.
```
