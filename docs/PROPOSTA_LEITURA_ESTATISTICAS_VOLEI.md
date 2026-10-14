# Proposta de leitura das estatísticas de vôlei

## Objetivo

Durante e depois do jogo, o treinador deve conseguir responder em poucos segundos: como está o placar, onde a equipe ganha ou perde pontos e quais atletas ou rotações merecem atenção. A tela atual mostra dois painéis extensos (Resumo e Análise), muitos cartões e gráficos de naturezas diferentes. As tabelas são largas e os controles de PDF competem visualmente com a leitura da partida.

## Estrutura proposta

```text
Partida · Set 2 · Olympico 18 × 16 Adversário
[Partida inteira] [Set 1] [Set 2]       [Olympico] [Adversário] [Comparar]

VISÃO GERAL
Ataque: 12 pontos / 30 tentativas · eficiência 23%  |  Saque: 3 aces / 2 erros
Recepção: 58% positiva (14/24)           |  Bloqueio: 4 pontos
Cobertura: só Olympico; adversário sem scout individual

ONDE AGIR
R2: sideout 33% (2/6) · menor amostra/resultado entre as rotações
#08: 5 erros em 18 ataques · conferir decisões no recorte selecionado

[Fundamentos] [Rotações] [Atletas] [Quadra e sequências] [Dados completos]
```

### 1. Cabeçalho fixo de contexto

Placar, sets e recorte sempre visíveis. Um filtro de período (partida ou set) e um filtro de equipe governam todos os blocos. O modo “Comparar” só aparece quando existem eventos suficientes das duas equipes. A equipe sem atletas cadastrados continua visível no placar, mas seus dados individuais mostram “sem cadastro”, nunca zeros que pareçam estatística medida.

### 2. Visão geral curta

Quatro blocos por equipe: **ataque**, **saque**, **recepção** e **bloqueio**. Cada bloco apresenta um valor principal, volume e numerador/denominador. Em ataque, mostrar pontos, erros, ataques bloqueados e eficiência; em saque, aces e erros; em recepção, positiva/excelente; em bloqueio, pontos. “Sideout” e “breakpoint” entram em uma linha própria de dinâmica dos rallies, pois dependem da cobertura da sequência. A visão geral deve caber em uma tela comum sem exigir rolagem horizontal.

### 3. Leitura acionável com amostra explícita

Até três achados por recorte, calculados apenas de eventos observados: pior rotação em sideout, concentração de erros de ataque e destaque positivo. Cada frase inclui a base, como `2/6`, e é omitida quando a amostra for insuficiente. O texto descreve o observado; não atribui causa ou recomenda troca automática de atleta. Um clique abre a tabela ou os eventos que sustentam o achado.

### 4. Detalhamento progressivo

- **Fundamentos:** tabela compacta por equipe, com comparação apenas entre métricas da mesma unidade. A eficiência de ataque pode ser negativa; ela não deve dividir um eixo de 0–100% com recepção ou sideout.
- **Rotações:** seis linhas R1–R6 com sideout, breakpoint, eficiência de ataque e volume. Ordenação por posição por padrão, com destaque visual suave para valores de atenção.
- **Atletas:** uma tabela por fundamento, em vez de 13 colunas misturadas. Nome e camisa ficam fixos; no celular, os detalhes de cada atleta se abrem em uma linha/cartão.
- **Quadra e sequências:** mapa, trajetórias, distribuição do levantador e caminhos do rally ficam após a visão básica, com seus próprios filtros e legendas.
- **Dados completos:** tabelas auditáveis, modelo avançado e configuração de gráficos do PDF ficam em uma área recolhida. Exportar PDF permanece acessível por um botão no cabeçalho, sem ocupar o fluxo principal de análise.

## Regras de apresentação

1. `—` significa sem base calculável; `0` significa que houve observação e o resultado foi zero. Explicar o motivo da ausência, inclusive cobertura parcial e equipe sem cadastro.
2. Toda taxa tem volume ao lado ou em detalhe acessível por toque/teclado. Não depender de `title`/hover para mostrar a base.
3. Usar nomes completos das métricas na primeira ocorrência. Abreviações como `EF%` só aparecem com legenda persistente.
4. Escalas e cores têm significado estável. Não usar vermelho/verde como único sinal; incluir texto e números.
5. Cada painel usa `min-width: 0`; gráficos se ajustam à largura; tabelas largas rolam dentro do próprio painel. Em telas pequenas, cartões e tabelas passam a uma coluna.
6. A estimativa de vitória fica separada das estatísticas observadas e traz a indicação de que ainda precisa de calibração histórica para uso preditivo.

## Dados existentes e trabalho necessário

O `MatchReportModel` já oferece placar, sets, cobertura, resumo por equipe, ataque/saque/recepção/bloqueio por atleta e rotações com taxas auditáveis. A reformulação pode começar pela apresentação, sem mudar os registros do scout. Para filtro por set em todos os fundamentos, será necessário conferir e, onde faltar, ampliar as agregações do relatório; não filtrar somente a interface sobre totais da partida.

## Ordem de implementação e critérios de aceite

1. Unificar cabeçalho, filtros e quatro blocos de visão geral; manter dados atuais como fonte.
2. Reorganizar tabelas por fundamento e rotação; ajustar responsividade em celular, tablet e desktop.
3. Adicionar achados com critérios de amostra documentados e acesso aos eventos de origem.
4. Mover controles avançados/PDF para seção própria e alinhar o PDF à nova hierarquia visual.

Validar com uma partida completa, um set em andamento, um scout de uma equipe só e uma partida cujo adversário não tem atletas registrados. Conferir que nenhuma taxa sem denominador aparece como `0%` e que nenhum painel ultrapassa a largura da tela.
