> **Versão/escopo:** Base do app 0.4.0; pacote Futebol 0.1 (numeração própria do módulo).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../../COMECE_AQUI.md).

# F2 — Posse e registro híbrido em eventos StatsBomb

**Leia primeiro:** `AGENTS.md`, plano geral, F1 e `ESTADO.md`. **Executar apenas F2.** Meta: uma pessoa opera o scout em tempo real pela sequência **ação → direção apenas quando faz sentido → qualificador curto → próxima ação**.

## Modelo de posse e interface

- Criar posse com equipe controladora, número StatsBomb `possession` sequencial, origem observada, instante/período e ID local na extensão. `possession_team` pertence ao controlador; `team` pertence ao autor do evento, inclusive adversário. Uma nova bola parada após a bola sair inicia **nova posse mesmo que seja da mesma equipe**. Bola solta após desvio não transfere controle até observação de recuperação. Permitir posse incompleta/controle pendente e correção posterior.
- Painel de ações visível ao lado do campo, sequência da posse e Desfazer sempre visíveis. Seleção mostra só a próxima pergunta necessária. Uma ação sem posição pode ser salva com atalho explícito. Uma ação sem direção nunca abre o gesto de trajetória. Sem atleta é permitido; atalhos/teclado se o projeto já os usa. Resultado principal deve caber em poucos toques; demais detalhes vão para “Mais contexto” na F3.
- A captura gera diretamente envelopes StatsBomb com seus blocos, IDs e relação entre eventos; `scout_trainer` guarda observações adicionais e casos incertos. Não salvar um tipo genérico para depois inventar sua tradução. Para evento realmente não mapeável, reter extensão e listar como não exportável ao formato puro.

## Matriz de ações nesta etapa

| Botão | Gesto | Evento e qualificador logo após o gesto |
| --- | --- | --- |
| Passe | Arrasto origem→destino ou dois toques; pular posição permitido | `Pass` 30; perguntar `Dominou? Sim / Tocou sem dominar / Interceptado / Saiu / Não observado`. No toque sem domínio: `Quem ficou? mesma equipe / adversário / fora / indefinido`. `pass.end_location` só com destino observado. `pass.outcome` deve seguir especificação; não confundir recepção incompleta com passe que sequer alcançou companheiro. |
| Condução | Arrasto opcional | `Carry` 43 e `carry.end_location` se observado. Perguntar se manteve bola/perdeu/não observado. |
| Drible | Origem/destino opcionais | `Dribble` 14 quando houve tentativa de superar oponente; resultado observado no bloco `dribble`. Não gerar Carry automaticamente. |
| Desarme | Nenhuma direção, ponto opcional | `Duel` 4 com `duel.type:{id:11,name:'Tackle'}` quando realmente disputou bola do portador; outcome `Won` somente controle próprio observado; desvio para colega tem outcome próprio. |
| Interceptação | Nenhuma direção, ponto opcional | `Interception` 10 somente quando cortou passe adversário; outcome distingue posse do interceptador, bola em jogo com colega, fora ou não sucesso. |
| Recuperação | Nenhuma direção, ponto opcional | `Ball Recovery` 2 para bola solta; não marcar como controlada se tentativa falhou. |
| Perda | Nenhuma direção, ponto opcional | `Dispossessed` 3 se o portador foi desarmado sem tentar drible; `Miscontrol` 38 se errou domínio. Se causa não observada, guardar perda indeterminada só na extensão, com motivo do bloqueio de exportação pura. |
| Chute/gol | Ponto de origem opcional | `Shot` 16, outcome observado `Goal` 97 / `Saved` 100 / `Blocked` 96 / `Off T` 98 / `Post` 99 ou `Wayward` 101 quando definição atendida; local/alvo detalhados na F3. Gol altera placar por regra derivada do evento. |

## Passe tocado sem domínio: a regra que merece teste

Um único fluxo de registro pode criar **um `Pass` e uma `Ball Receipt*` 42 vinculados** por UUID (`related_events`) quando a tentativa de recepção e seu local/equipe foram de fato observados. Marcar `ball_receipt.outcome:{id:9,name:'Incomplete'}` se a recepção não se completou. Criar `Miscontrol` somente quando o toque ruim e perda foram também observados. Se não se sabe quem recebeu ou onde ocorreu, preservar o dado `touched_without_control` sob `scout_trainer` e explicar a lacuna na exportação pura. Se passe foi interceptado antes de chegar ao companheiro, usar `pass.outcome:Incomplete` e, se observada, `Interception` do rival; não criar Ball Receipt do companheiro. **Não deduzir êxito pela ausência de `pass.outcome` quando a coleta foi parcial.**

A opção “Tocou sem dominar” não define sozinha o próximo controlador. Mesma equipe mantém posse, rival com controle estabelecido abre nova posse, fora encerra e a reposição seguinte inicia posse nova, indefinido mantém controle pendente. Defender pode ter evento `Duel`/`Interception` na posse do atacante antes da troca efetiva. Salvar/editar/desfazer a ação mantém IDs relacionados íntegros, renumera `index` global deterministicamente quando necessário e recalcula placar.

## Verificações obrigatórias

1. Passe dominado com origem/destino e recepção relacionada; passe tocado mas não dominado que a mesma equipe recupera; passe tocado mas não dominado que termina em disputa; passe interceptado antes do companheiro; passe sem posição e sem atleta.
2. Desarme sem direção/posição; interceptação que só desvia e não troca posse; condução seguida de drible; chute defendido com rebote da mesma equipe; gol, gol contra em correção manual e desfazer.
3. Duas posses consecutivas da **mesma** equipe separadas por lateral; índices estáveis e ordem verificável após reabertura/edição; placar reconstituído sem duplicar gol. Eventos com lacunas explícitas, sem coordenada inventada.

## Prompt para Luna

> Leia `AGENTS.md`, o plano geral, F1, este F2 e `ESTADO.md`. Implemente só F2: posse StatsBomb, ações do quadro, UI híbrida rápida, pergunta do domínio do passe, Ball Receipt* observada e correção/desfazer. Faça eventos StatsBomb canônicos com extensões apenas para extras e incertezas; não atribua posse ou sucesso por inferência. Teste os casos obrigatórios, sobretudo toque sem domínio e lateral para a mesma equipe. Preserve vôlei e atualize `ESTADO.md`. Não avance para F3–F5.
