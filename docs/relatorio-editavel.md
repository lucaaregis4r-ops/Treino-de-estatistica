# Relatório editável

Na tela **Resumo**, o painel **Editar e gerar relatório** permite alterar título,
subtítulo, responsável, observações e seções. A prévia usa o mesmo renderer do
PDF exportado. O botão **Gerar PDF** e o PDF do pacote de pasta aplicam o rascunho atual.

O rascunho é salvo no armazenamento local, separado por partida. **Baixar rascunho**
gera um JSON para reabrir com **Abrir rascunho** na mesma partida. Esse arquivo
contém as escolhas editoriais; para levar a partida a outro dispositivo, leve
também o backup `partida.json`. O rascunho não é incluído automaticamente no backup.

Os valores estatísticos continuam derivados dos eventos: correções numéricas são
feitas no scout. O PDF inclui somente os gráficos marcados em **Análise → Gráficos
selecionados**, na ordem salva, com seus títulos e filtros. O resumo da partida é
opcional. Gráficos não selecionados e tabelas estatísticas completas não são adicionados
automaticamente. Rascunhos antigos mantêm seus textos e passam para essa composição.

Os seis tipos disponíveis são desenhados como gráficos vetoriais no PDF e na prévia:
linhas de probabilidade, barras de performance, barras por rotação, barras empilhadas
da distribuição, uniformidade e repetição. Sem amostra, o gráfico selecionado informa
a indisponibilidade. O editor lista os gráficos e oferece acesso à seleção/ordenação.

Para incluir variações, escolha **Gráfico para adicionar**, ajuste **Equipe do
relatório**, **Atacante do relatório** e **Posição do levantador no relatório** e
clique em **Adicionar gráfico com estes filtros**. Cada inclusão tem um ID, título,
recorte e posição próprios. **Criar variação** preenche os controles a partir de uma
versão existente; altere os filtros e adicione a nova versão. Renomear, mover ou
remover uma versão não substitui as demais.

## Layout e paginação

- Paleta do programa: verde escuro, lima e cores das equipes.
- Resumo com placar do último set, sets vencidos e indicadores por equipe.
- Tabelas com colunas, quebra de texto e cabeçalhos repetidos na continuação.
- Páginas adicionais conforme o conteúdo, sem cortes por limite de linhas.
- Acentos em WinAnsi e escapes octais mantêm a string do PDF em ASCII, compatível
  com o download e a exportação de pasta. Offsets e comprimentos são calculados
  sobre os bytes ASCII emitidos.

Os testes cobrem linhas além da primeira página, offsets PDF, acentos, edição,
seleção de seções, equivalência entre PDF individual e pacote, reabertura do
rascunho e uso do editor em viewport móvel.
