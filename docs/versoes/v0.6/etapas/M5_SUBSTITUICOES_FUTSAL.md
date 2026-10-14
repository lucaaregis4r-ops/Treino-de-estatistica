# M5 — substituições volantes do futsal

**Objetivo:** registrar trocas de futsal em jogo, sem rotação e sem parar o relógio. **Depende de:** M1, M2 e M4. **Próxima:** M6.

## Regras da modalidade

As [regras FIFA 2025–26](https://www.the-aiff.com/media/uploads/2025/09/Futsal-Laws-of-the-Game-2025-2026_EN.pdf) permitem substituição durante a bola em jogo, observadas as regras de zona e procedimento. O scout registra a troca vista; não valida a arbitragem. Uma equipe pode ter cinco atletas em quadra, um deles goleiro, e o goleiro-linha pode mudar a função observada sem exigir que o operador refaça o elenco.

## Implementação

1. Botão **Substituição** sempre acessível no scout de futsal. Selecionar equipe, atleta que sai e atleta que entra; busca por camisa/nome com ID como identidade. Não pedir clique na quadra, parada da bola, pausa de T ou classificação tática.
2. Se o operador conhece os cinco atletas em quadra, usar essa composição para filtrar “sai” e banco para “entra”. Se só conhece parte, mostrar **composição parcial**; aceitar evento observado de saída/entrada e atualizar apenas as certezas. Não inferir titulares nem registrar substituição fictícia. Se a troca foi vista mas um dos atletas não foi identificado, permitir anotação parcial marcada como tal, sem mudar composição conhecida incorretamente.
3. Persistir evento com equipe, IDs opcionais justificados por cobertura, período/tempo efetivo e sequência. IDs iguais ou atletas de equipes diferentes são inválidos. Composição plenamente conhecida não pode terminar com mais de cinco nem com entrada duplicada. Definir no M0 como representar goleiro e expulsão/inferioridade sem forçar quinta vaga.
4. Reprojetar estado em quadra após correção, desfazer e recarga; trocas sucessivas A→B→A e troca simultânea/rápida de dois atletas têm ordem determinística. O evento não muda posse, placar, falta ou relógio.
5. **Goleiro-linha** é marcação observada de situação numérica/função com início e fim; pode coincidir com uma substituição, mas não é inferido automaticamente do número da camisa ou do local da bola.

## Aceite e verificação

Testar duas equipes, titulares conhecidos/parciais, entrada desconhecida, atleta de equipe errada, entrada já em quadra, cinco atletas, inferioridade, troca com relógio rodando, reentrada, duplas rápidas, goleiro-linha, correção/desfazer e backup/reload. E2E deve mostrar fluxo sem navegação ao campo e sem pausar T. Regressão de substituições de futebol e vôlei da M1.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M5. Implemente apenas as
substituições volantes do futsal. Não use `ScoutTrainerService.substitute()`
do vôlei, pois ele depende de slot e rotação. Preserve composição parcial
como parcial. Teste troca durante o tempo rodando, correção, desfazer e
recarga. Relate arquivos e testes; não inicie M6.
```

## Implementação M5 — 30/09/2026

- **Composição:** o scout permite registrar uma observação completa (cinco atletas, ou inferioridade explícita) ou parcial; nenhum titular é criado automaticamente. A projeção lista somente atletas confirmados e aceita que a troca inteira tenha atletas não identificados. `Player.active` continua sendo cadastro, não escalação.
- **Substituição:** ação sempre visível fora da quadra, com equipe e atletas de saída/entrada; aceita fato parcial mesmo sem IDs quando a troca foi vista, mantém sequência e tempo efetivo e funciona com o relógio rodando. Composição conhecida filtra as escolhas e valida saída, duplicata de entrada e limite de cinco. Fatos não mexem em posse, placar, faltas ou relógio.
- **Goleiro-linha:** controles de início/fim por equipe registram situação observada separada da substituição. Não se deduz a função por camisa, posse ou posição.
- **Histórico/backup:** correção mantém a posição cronológica original do fato durante a reprojeção; desfazer restaura estado anterior. Backup 1.3 valida fatos de composição, troca parcial e goleiro-linha.
- **Verificação:** testes do domínio e do backup passam. O E2E cobre substituição parcial não identificada com relógio rodando, correção/desfazer e goleiro-linha, em desktop e viewport móvel. Typecheck, lint e execução E2E ficam registrados no estado após validação.
- **Limite:** reload manual e inspeção visual física seguem para M8; a persistência usa o mesmo histórico de eventos e envelope de backup testado.

**Referência de regra:** [FIFA Futsal Laws of the Game 2025–26, Lei 3 — os jogadores](https://www.the-aiff.com/media/uploads/2025/09/Futsal-Laws-of-the-Game-2025-2026_EN.pdf). O scout guarda a observação feita pelo operador e não valida o procedimento disciplinar da arbitragem.
