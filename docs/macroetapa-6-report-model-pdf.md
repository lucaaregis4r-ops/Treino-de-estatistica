# Macroetapa 6 — Report Model e PDF

> Atualização: o relatório agora tem editor, prévia e paginação dinâmica. Veja
> [Relatório editável](relatorio-editavel.md). A descrição de seis páginas fixas
> e texto transliterado abaixo registra a implementação inicial.

## Resultado

O produto agora gera um relatório pós-jogo em PDF diretamente do `MatchReportModel`. O PDF não captura nem replica a árvore visual da `SummaryScreen`: ele é uma saída independente do mesmo modelo auditável usado pela tela e pelo CSV estatístico.

## Pipeline

```text
MatchEvent[]
  → replay e scouts efetivos
  → MatchAnalyticsService
  → MatchReportModel
       ├── SummaryScreen
       ├── StatisticsCsvExporter
       └── MatchPdfRenderer
```

Correções, undo, redo, substituições e rotações são resolvidos antes da construção do modelo. Exportar novamente sempre recalcula todos os artefatos a partir dos eventos atuais.

## Estrutura do PDF

O `MatchPdfRenderer` produz seis páginas:

1. resumo, placar, sets, competição, duração observada, volume e cards por equipe;
2. box score por atleta para ataque, saque, recepção e bloqueio;
3. ataque por atleta, posição atual do levantador, origem, destino e direção;
4. saque e recepção por atleta;
5. sideout, breakpoint e demais indicadores por rotação;
6. distribuição do levantador por posição, recepção, atacante, zona e combinação.

Cada percentual relevante inclui sua fração `[numerador/denominador]` no próprio documento.

## Formato técnico

O renderer produz um documento PDF 1.4 com:

- seis objetos de página;
- streams de conteúdo independentes;
- fonte Type1 Helvetica;
- tabela `xref`, trailer e `startxref` calculados;
- conteúdo ASCII transliterado para manter compatibilidade com a porta atual de escrita em pasta, que recebe strings.

O arquivo pode ser baixado individualmente com MIME `application/pdf` ou gravado no pacote de uma pasta conectada.

## CSV estatístico

`StatisticsCsvExporter` serializa os mesmos `AuditableMetric` do relatório. Cada linha informa seção, equipe, atleta, rotação, métrica, numerador, denominador e valor decimal.

## Pacote final

```text
match-name/
├── partida.json
├── eventos.csv
├── scout.txt
├── estatisticas.csv
└── relatorio.pdf
```

O JSON permanece como exportação mestre e conserva o log completo necessário ao replay.

## Cobertura

Os testes verificam:

- assinatura PDF 1.4 e seis páginas;
- presença das seis seções;
- offsets `xref`, trailer e encerramento válidos;
- segurança ASCII do documento escrito como string;
- igualdade entre valores auditáveis do modelo, PDF e CSV;
- igualdade do PDF individual e do PDF incluído no pacote;
- nomes e conteúdo dos cinco arquivos finais;
- download PDF e exportação do pacote no fluxo E2E.
