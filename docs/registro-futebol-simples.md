# Registro simples de futebol

O futebol usa um único registrador. Selecione a equipe com a bola e clique no campo para registrar posições. Inicie o relógio no cabeçalho. Direção de ataque, período, ajustes de placar e exportações ficam em **Ajustes da partida**.

- **P**: pressão na bola; **S**: sem pressão; **N**: não observada. A escolha registra uma observação naquele instante e acompanha os próximos registros. Ela reinicia ao trocar o controle, pausar ou reabrir o registro. Não observada é diferente de sem pressão.
- **J**: focar o seletor de jogador. O jogador é opcional e vale para o ponto ou ação registrada; após uma ação, a seleção é limpa para evitar atribuições acidentais.
- **A**: passe certo; **Q**: passe errado; **C**: condução; **D**: drible certo; **E**: drible errado; **T**: desarme ganho; **B**: desarme perdido; **I**: interceptação; **R**: recuperação; **L**: perda; **V**: falta; **F**: finalização.
- O atalho já define a ação e seu resultado. Passe e condução salvam ao completar origem e destino; ações pontuais salvam no clique no campo. Perda e falta são registradas imediatamente pelo atalho, sem posição inventada. Não há botão de confirmação. **Esc** cancela o rascunho; **Z** desfaz o último registro; **1/2** selecionam a equipe com a bola. Se a gravação falhar, o rascunho é preservado com a opção de tentar novamente.
- Atalhos não atuam durante digitação ou seleção em campos, nem com Ctrl, Alt, Meta ou Shift. Repetições por tecla mantida são ignoradas.

Na análise, **Mapa de calor** conta posições registradas por célula de 10×10 nas coordenadas originais do campo. Use **Bola observada** para incluir os marcos do registro simples, ou **Somente ações**. Os filtros incluem equipe, jogador, período, pressão e ação. O mapa representa frequência de registros, não tempo de permanência nem movimento contínuo dos atletas.

**Markov** oferece diagramas entre zonas e entre ações. Setas mostram a frequência relativa ao total de saídas do estado e a contagem observada. As zonas usam a direção de ataque informada; ausência de direção não é preenchida automaticamente. Filtros e interrupções da coleta não criam ligações artificiais. Os diagramas descrevem a amostra registrada, sem estimar trajetórias entre cliques nem prever resultados futuros.
