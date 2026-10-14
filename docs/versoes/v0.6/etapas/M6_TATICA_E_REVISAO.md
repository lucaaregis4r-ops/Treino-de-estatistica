# M6 — tática observada e revisão voluntária

**Objetivo:** deixar o scout útil ao treinador sem sobrecarregar o registro ao vivo. **Depende de:** M4–M5. **Próxima:** M7.

## Vocabulário curto

| Dimensão | Valores de registro | Quando preencher |
|---|---|---|
| Organização ofensiva | posicional, transição/contra-ataque, bola parada, outra, não observada | Posse ou trecho cuja organização foi vista. |
| Origem da bola parada | lateral, escanteio, tiro livre, tiro de 10 m, pênalti, arremesso de meta, saída, outra, não observada | Ligada ao reinício; não equivale ao resultado. |
| Situação numérica | regular, goleiro-linha próprio, goleiro-linha adversário, expulsão/inferioridade, outra, não observada | Intervalo observado; pode coexistir com qualquer organização. |
| Defesa e goleiro | pressão na bola, bloco alto/médio/baixo, recuperação, defesa do goleiro, não observada | Só se houver evidência específica. Altura de bloco não mede intensidade. |
| Estrutura ofensiva | 3–1, 4–0, 2–2, outra, não observada | Apenas na revisão; não inferir de marcos da bola. |

## Implementação

- Tela ao vivo mostra no máximo um acesso **Detalhes** e, se o piloto indicar viabilidade, até três ações rápidas configuráveis pelo operador. Nenhuma etiqueta é obrigatória para registrar toque, chute ou troca.
- Revisão voluntária permite classificar/corrigir trechos já observados, incluindo perda/recuperação, bola parada, defesa e goleiro-linha. Vincular etiquetas a intervalo ou evento por ID; se o contexto mudou na posse, preservar ambas as anotações em seus instantes.
- `não observado`, `outro` e ausência de preenchimento são estados diferentes. Sugestões do futebol podem inspirar a UI, mas não criar passe, formação ou superioridade por inferência. Não abrir revisão automaticamente durante jogo.
- Mostrar definição curta de cada categoria no local de escolha, em português de futsal. Contexto tático não modifica placar, faltas, tempo ou posse base.

## Aceite e verificação

Uma partida inteira deve funcionar sem detalhes. Classificar, remover e reclassificar uma posse mantém evento e escore. Testar dois contextos na mesma posse, goleiro-linha após substituição e correção de fonte. Inspecionar 390×844, foco/teclado e retorno à coleta sem perda do estado; medir apenas interações automatizadas como automação, não como esforço humano.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M6. Implemente somente as
categorias observacionais opcionais e a revisão voluntária. Não infira
formações nem ação técnica a partir de pontos esparsos. Preserve os
eventos base e a coleta ao vivo. Relate evidências; não inicie M7.
```

## Implementação M6 — 30/09/2026

- **Painel opcional:** “Detalhes de revisão” fica fechado inicialmente. A partida continua registrável sem selecionar categoria tática; T e atalhos do scout seguem utilizáveis.
- **Vocabulário observado:** organização posicional/transição/bola parada/outra/não observada; origem do reinício; situação numérica; pressão/bloco alto, médio ou baixo/recuperação/defesa do goleiro; estrutura 3–1, 4–0, 2–2/outra. Campos vazios significam sem classificação; “não observado” é um rótulo explícito. Estrutura exige anotação humana, nunca é inferida dos pontos.
- **Alcance da revisão:** anotações opcionais referenciam um fato de jogo ou o intervalo ordenado entre dois fatos no mesmo período. A tela lista, corrige/reclassifica e remove anotações; a remoção é uma correção tombstone reversível, sem excluir a anotação original do histórico. Referências inválidas, intervalo invertido ou atravessando período são rejeitados no serviço e no backup 1.3.
- **Separação do jogo:** anotação não altera posse, placar, faltas, relógio nem os fatos-base. Mais de uma etiqueta pode apontar para uma mesma posse/lance. A tela informa que categorias descrevem, não são metas/benchmarks; os estudos consultados reportam perfis diferentes entre ligas e sequências.
- **Verificação:** typecheck, lint dirigido, 13 testes de domínio/backup, diff check e E2E passam. E2E cobre classificação, reclassificação, remoção, intervalo, scout anterior, M5 e viewport 390 × 844.
- **Referências:** [Méndez et al. (2019)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.01370/full) analisaram 56 jogos de playoffs das ligas portuguesa, espanhola e russa e registraram ataque posicional, contra-ataque, bola parada e 5v4+goleiro; [Amatria et al. (2021)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.578332/full) observaram sequências de gol em ligas espanhola e italiana e encontraram padrões que variam entre elas. As categorias inspiram a descrição do scout; percentuais e padrões dos estudos não são aplicados como referência universal.
- **Próxima etapa:** M7 — análises descritivas e bloqueio de xG/xT de futebol no futsal.
