# Qualidade, trocas e espacialidade no vôlei

## Registro

Recepção (passe) e defesa aceitam `#` perfeita, `+` positiva, `-` negativa e `=` erro. As quatro escolhas funcionam por botão e teclado. Sem escolha mantém-se a avaliação neutra existente; ela não é contada como uma das quatro notas na taxa de contatos positivos. `#` na recepção/defesa mantém o rally em jogo; `=` encerra-o a favor do adversário.

## Unidade da cadeia

Contatos consecutivos de equipes adversárias no mesmo set e rally formam uma etapa conjunta quando são **saque → recepção** ou **ataque → defesa**. A etapa é descrita pela ação enviada e pela qualidade observada na resposta. Sua saída é a próxima etapa ou o terminal real.

Exemplo: `Saque / Recepção − → Levantamento → Ataque / Defesa + → …`. Não há uma aresta `Saque + → Recepção −` baseada somente na mesma avaliação. Repetições reais de uma mesma troca continuam contadas; apenas os dois contatos da própria troca compartilham a etapa.

Na projeção, a pressão do envio pode ser deduzida da resposta:

| Resposta | Pressão inferida do envio |
|---|---|
| # | − |
| + | neutra |
| − | + |
| = | # |

Essa é uma convenção descritiva deste scout, não uma norma universal nem uma nota independente. Notas explícitas do envio permanecem intactas. Envio sem nota ou neutro pode usar a nota inferida no recorte analítico, com identificação de sua origem e vínculo ao evento da resposta. A nota do envio não cria uma dimensão redundante dentro do estado conjunto.

Não são inventados recebedores, defensores ou contatos omitidos. Uma ação sem resposta observada continua isolada. Ações terminais não são pareadas com contatos seguintes. Bloqueio intercalado permanece uma etapa própria; não é pulado para ligar artificialmente ataque e defesa. Eventos originais e placar não são reescritos. Corrigir ou desfazer um contato recalcula a projeção.

## Estados espaciais

Cada estado inclui equipe, fundamento, qualidade e zonas conhecidas de origem e destino. Na troca conjunta, inclui as zonas dos dois contatos. São as mesmas seis zonas da quadra compartilhada, na perspectiva de cada equipe. Coordenadas completas são convertidas antes de classificar a zona. Sem coordenadas ou zona observada, a posição fica desconhecida; não se atribui um centro de zona fictício.

A absorção usa a matriz de transições entre esses estados até o vencedor registrado. O recorte por atleta/qualidade/zona define a distribuição da primeira saída; o restante usa o contexto selecionado. É uma cadeia de primeira ordem descritiva, condicionada à troca já observada, e não uma previsão pré-saque. Rallies sem desfecho conhecido ou conflitantes ficam fora da estimativa. A cobertura parcial ainda limita as conclusões.

## Eficácia por zona

A tabela compara origem ou destino, mantendo os demais filtros. Exibe:

- ações e rallies distintos;
- proporção de `#`/`+` entre os contatos com uma das quatro notas;
- proporção de rallies vencidos, sem contar duas vezes o mesmo rally dentro de uma zona;
- potencial de ponto estimado pela cadeia espacial.

Uma mesma jogada pode participar de zonas diferentes. Os grupos não são amostras independentes e não devem ser somados como se fossem rallies distintos. Menos de dez rallies é identificado como poucos registros. Percentuais são descritivos, sem interpretação causal ou garantia de superioridade. Grupos sem localização ficam no recorte geral, fora da comparação por zona.

## Compatibilidade e exportação

`buildRallyPathModel` usa trocas e zonas por padrão. As opções `{ unit: 'contact', spatial: 'none' }` permitem auditar a cadeia antiga. O relatório derivado mantém agregados históricos por fundamento e acrescenta `exchangeModel` com transições e valores do modelo atual, sob o método `scout-trainer-0.6-s3-exchange-spatial`. Não copia eventos nem modifica backups.

Testes: `RallyExchangeModel.test.ts`, `GestureScout.test.tsx`, `SequenceAnalyticsPanel.test.tsx` e `e2e/contact-quality-markov.spec.ts`.

## Validação · 08/10/2026

- 50 testes específicos aprovados em dez arquivos: cadeia, trocas, espacialidade, quatro notas, pontuação, interface, recálculo e exportação.
- Dois cenários novos de navegador aprovados: oito combinações de recepção/defesa persistidas e reabertas; saque–recepção conjunta com nota inferida auditável e coordenadas.
- Cinco cenários anteriores de quadra também passaram: registro, teclado, futebol, futsal e recuperação de falha de gravação.
- ESLint dos arquivos desta revisão aprovado.
- Build de produção aprovado. Mantém-se o aviso já existente de bundle acima de 500 kB.
- Conferência visual das quatro notas no celular e da cadeia espacial; ausência de rolagem horizontal verificada em 1366, 768 e 390 px para a nova análise.

A suíte geral do projeto não foi repetida nesta revisão; estes resultados se referem à cobertura específica acima.
