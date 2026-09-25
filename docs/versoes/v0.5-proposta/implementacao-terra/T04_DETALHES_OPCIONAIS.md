# T04 — Um acesso para detalhes opcionais

**Versão:** 0.5 proposta. **Dependência:** T03. **Resultado:** quatro detalhes sem aumentar o caminho obrigatório.

## Entradas de código

Composição mínima, contratos de T03 e `src/application/ScoutTrainerService.ts`; `src/ui/screens/scout/football/FootballContextDrawer.tsx`/`FootballTacticalQuestion.tsx` apenas para reaproveitar semântica, não a composição rejeitada. Usar elenco real existente.

## Implementar

Um botão **Detalhes** na região contextual abre Pressão, Saída, Roubada, Jogador. Uma categoria por vez; escolher salva/fecha. Fechar/Escape não fabrica dado. Campo/troca/chute continuam ativos e encerram detalhe antigo. Nada abre automaticamente.

| Categoria | Opções | Vínculo |
|---|---|---|
| Forma da pressão | Livre, Individual, Coletiva, Não observada | Instante/equipe/posse; adversária é quem pressiona |
| Saída | Curta, Direta, Mista, Transição, Não observada | Trecho de construção/posse observado |
| Estrutura da saída | 2+2, 3+1, 3+2, Outra, Não observada | Campo separado, acessado opcionalmente dentro de Saída |
| Roubada | Desarme, Interceptação, Bola solta, Erro adversário, Não observado | ID da troca elegível, não último ponto |
| Jogador | Camisas/nomes do elenco, Não identificado | ID do ponto observado, não posse inteira |

Na T05, o acesso Pressão também oferece fixar sua coleta; não antecipar linha permanente nesta T04.

## Regras

- Livre na forma representa ausência observada; manter coerência com Sem pressão da T05, sem preencher altura. Forma presente sem altura continua válida. Anotação nova não reclassifica snapshots antigos.
- Transição não herda estrutura de saída organizada. Escolher Curta não força nova pergunta. Saída/estrutura não persistem para a posse seguinte.
- Roubada só habilita para troca adversária elegível, inclusive A → disputa → B. A → disputa → A, primeiro controle e reinício não são roubadas. Permitir qualificar após mais alguns marcos da mesma posse, mantendo ID original.
- Não atribuir local da recuperação/perda pela última posição, nem culpa/autoria pelo último jogador. Erro adversário pode permanecer sem autor.
- Jogador identifica somente aquele ponto da equipe indicada; próximo ponto volta a desconhecido. Sem elenco, campo continua operável. Não limitar elenco a seis camisas da demonstração; nomes acessíveis e escolha por teclado/toque.
- Abrir congela alvo. Troca/pausa/período encerra edição. Chute tem prioridade na faixa; não ocultar resultado pendente com detalhes.

## Aceite e testes

Partida inteira sem abrir Detalhes. Escolher cada categoria sem bloquear registro. Testar vínculos, ausência de herança, reinício sem roubada, transição/estrutura, desfazer só anotação, reload e alvo antigo. Inspeção desktop/móvel com elenco realista; typecheck/testes dirigidos. Atualizar T04; próxima T05.
