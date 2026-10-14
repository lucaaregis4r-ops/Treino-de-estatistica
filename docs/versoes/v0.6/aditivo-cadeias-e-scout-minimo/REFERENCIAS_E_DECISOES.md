# Literatura e decisões metodológicas

## Trajetória inteira e cadeias de Markov

- [Hileno, Arasanz e García-de-Alcaraz (2020), *The Sequencing of Game Complexes in Women’s Volleyball*](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.00739/full): analisa a sequência dos complexos dentro de rallies, incluindo rallies longos. Sustenta examinar começo, continuidade e fim do ponto; os resultados daquela amostra não são probabilidades universais para o app.
- [Accornero et al. (2025), *A toolbox for volleyball data analytics*](https://link.springer.com/article/10.1186/s40537-025-01284-6): constrói estados acumulando prefixos de contatos do mesmo rally e estados terminais de ponto. Demonstra uma forma Markoviana de preservar o histórico no estado; a quantidade de prefixos distintos impõe cautela com amostras pequenas.
- [Kröckel e Bodendorf (2020), *Process Mining of Football Event Data*](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2020.00047/full): trata cada posse como caso com ações ordenadas, variantes, duração e inspeção individual. É a referência mais direta para a primeira entrega descritiva de posse completa.
- [Korte et al. (2019), *Play-by-Play Network Analysis in Football*](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.01738/full): preserva a ordem dos passes por jogada antes de agregar redes. Seu recorte exige ao menos dois passes; o app deve incluir também posses de zero/um evento e declarar limites de cobertura.
- [Amatria et al. (2021), *Identification of the Patterns Produced in the Offensive Sequences That End in a Goal in European Futsal*](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.578332/full): análise sequencial de ataques que terminaram em gol, com diferenças entre ligas. Para comparar desfechos no Scout Trainer, incluir também posses sem gol; essa exigência é inferência metodológica nossa, pois o artigo recorta só gols.

## Técnicas complementares e limites

- [Bühlmann e Wyner (1999), *Variable Length Markov Chains*](https://statistics.berkeley.edu/tech-reports/479): árvore de contextos com comprimento variável. Ela melhora a estimação quando há padrões de memória diferentes, mas o recuo pode descartar parte do histórico; a trilha íntegra permanece no relatório.
- [Pei et al. (2001), *PrefixSpan*](https://www.cs.sfu.ca/~jpei/publications/spg.pdf): mineração de subsequências de comprimento variável. Usar apenas como padrão recorrente complementar, com suporte por unidades independentes e sem confundir ocorrência com rally/posse.
- [Le Coz, Boustila e Imbach (2026), *A Semi-Markov framework for modeling football possessions and temporal expected threat*](https://www.nature.com/articles/s41598-026-52938-1): incorpora tempo entre transições em futebol. Semi-Markov, por si só, não guarda a ordem de toda a posse; não transplantar o xT ou os parâmetros desse estudo ao futsal.

## Regras de interpretação no aplicativo

- Distinguir **contagem observada**, **associação por trajetória** e **probabilidade modelada**. Um grafo de transições locais não é evidência de uma sequência completa específica.
- Não cortar a trilha por limite de 2/3 ações nem usar as últimas ações como substituto do ponto/posse. Se houver agrupamento visual, oferecer expansão e exportação integral.
- Cada taxa mostra unidade, `n`, desfecho, quantidade de incompletas/censuradas e filtros. Vôlei: um `rallyId` conta uma vez no global, ainda que haja visão para as duas equipes. Futebol/futsal: uma posse conta uma vez por perspectiva definida. Não misturar ocorrência de ação com quantidade de posses.
- Não apresentar vantagem causal, prescrição de treino ou classificação universal a partir de uma partida. Probabilidades condicionais exigem suporte, validação por partidas e comparação com baseline; sem isso, mostrar apenas descrições.
