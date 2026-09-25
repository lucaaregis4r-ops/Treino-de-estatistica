> **Versão/escopo:** Transversal ao vôlei; sem release exclusivo declarado.
> **Classificação:** Referência de domínio; não define fila de implementação.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../COMECE_AQUI.md).

# SCOUT TRAINER — GUIA DE SEMÂNTICA DO VOLEIBOL
## Referência enxuta para implementação e inferências automáticas

> **Objetivo deste arquivo**
>
> Este documento NÃO é um plano de implementação e NÃO deve gerar auditorias.
> Ele funciona como **referência de domínio** para o Scout Trainer.
>
> Quando uma macroetapa precisar interpretar uma jogada, consultar somente a seção necessária deste guia.
>
> Prioridade:
>
> 1. registrar o que aconteceu;
> 2. inferir somente o que for logicamente seguro;
> 3. nunca inventar atleta, posição ou contato não observado;
> 4. manter o rally rápido de registrar no celular.

---

# 0. REGRA DE OURO

```text
OBSERVADO
↓
REGISTRAR

LOGICAMENTE INEVITÁVEL
↓
PODE INFERIR

APENAS PROVÁVEL
↓
NÃO INFERIR
```

Exemplo:

```text
Ataque termina fora
+
usuário informa que o ponto foi do atacante
↓
houve toque no bloqueio
↓
blockTouch = true
terminalCause = block_out
```

É seguro inferir **o toque no bloqueio**.

Não é seguro inferir:

```text
qual bloqueador tocou
quantos bloqueadores participaram
em qual mão ocorreu o toque
```

Sem informação adicional, não criar atleta fictício nem evento individual de bloqueio.

---

# 1. REGRA DO JOGO x REGRA DE SCOUT

Existem duas camadas diferentes.

## Regra do jogo

Define:

- quem ganhou o ponto;
- se a bola estava dentro ou fora;
- se houve falta;
- se o rally terminou.

## Regra de scout

Define:

- qual fundamento provocou o resultado;
- qualidade da ação;
- contexto tático;
- possíveis metadados derivados.

Nunca misturar as duas.

Exemplo:

```text
bola sai após tocar no bloqueio
```

Regra do jogo:

```text
ponto do time atacante
```

Scout:

```text
ataque = ponto
terminalCause = block_out
blockTouch = true
```

Não é necessário criar um segundo ponto de bloqueio.

---

# 2. QUALIDADES JÁ USADAS NO SCOUT TRAINER

O perfil atual trabalha com:

```text
# = excelente
+ = positiva
! = neutra
- = negativa
/ = muito negativa
= = erro
```

Para a interface gestual, nem todos precisam aparecer o tempo todo.

## Prioridade mobile

Mostrar principalmente:

```text
#     =
```

E deixar o sistema inferir continuidade quando possível.

Os demais podem existir internamente ou em edição posterior.

---

# 3. RESULTADO TERMINAL DO RALLY

Antes de avaliar fundamento, descobrir:

```text
o rally terminou?
```

Se SIM:

```text
qual time ganhou?
↓
qual foi a ação imediatamente responsável?
```

Resultados terminais comuns:

```text
ace
ataque no chão
block-out
bloqueio ponto
erro de saque
erro de ataque
erro de recepção
falta
```

---

# 4. SAQUE

## 4.1 Saque válido

```text
SAQUE
↓
bola entra em jogo
↓
esperar recepção adversária
```

Nenhum ponto deve ser inferido apenas porque houve saque.

## 4.2 Ace

Quando o saque termina diretamente em ponto:

```text
serve
evaluation = #
outcome = ace
winner = time sacador
rally = encerrado
```

Pode ocorrer porque:

- bola cai sem contato;
- recepção toca mas não mantém a bola em jogo;
- erro direto provocado pelo saque.

## 4.3 Saque para fora

```text
saque
↓
bola fora sem toque adversário
↓
serve =
winner = adversário
```

## 4.4 Saque na rede

Se a bola não atravessa validamente:

```text
serve =
winner = adversário
```

### Importante

Tocar na rede durante o saque **não é automaticamente erro**.

Se a bola toca a rede e continua validamente para a quadra adversária:

```text
rally continua
```

## 4.5 Saque provoca bola de graça

Exemplo:

```text
saque forte
↓
recepção ruim
↓
time receptor apenas devolve bola fácil
```

O botão:

```text
BOLA DE GRAÇA
```

pode enriquecer o saque anterior:

```text
serve +
```

desde que seja a pressão do saque que claramente tenha produzido a devolução fácil.

---

# 5. RECEPÇÃO

## 5.1 Recepção mantém construção normal

```text
serve
↓
reception
↓
set / construção ofensiva
```

O rally continua.

## 5.2 Recepção perfeita

Quando permite todas ou praticamente todas as opções ofensivas:

```text
reception #
```

O sistema não precisa decidir isso automaticamente apenas pela posição da bola.

Pode ser informado pelo usuário ou derivado no futuro por critérios específicos.

## 5.3 Erro direto de recepção

```text
saque
↓
recepção não mantém a bola jogável
↓
ponto adversário
```

Registrar:

```text
reception =
```

E o saque adversário pode ser:

```text
serve #
outcome = ace
```

A aplicação deve evitar duplicar estatísticas incompatíveis.

Se ambos forem mantidos no histórico:

```text
um mesmo rally
+
um mesmo resultado terminal
```

deve continuar valendo como **um ponto**, não dois.

## 5.4 Recepção passa diretamente para o outro lado

Pode acontecer:

```text
saque
↓
recepção
↓
bola atravessa a rede
```

Isso NÃO significa automaticamente erro.

Existem dois contextos:

### Overpass atacável

```text
recepção atravessa próxima à rede
↓
adversário pode atacar imediatamente
```

A recepção foi ruim/negativa.

### Bola fácil devolvida

```text
recepção atravessa sem pressão
↓
adversário recebe bola confortável
```

Pode ser tratada como situação de:

```text
free_ball
```

ou metadado equivalente.

Não inventar um levantamento que não existiu.

---

# 6. LEVANTAMENTO

## 6.1 Construção normal

```text
reception/dig
↓
set
↓
attack
```

Na interface gestual o levantamento pode ser **implícito**.

Exemplo:

```text
recepção registrada
↓
usuário seleciona atacante
↓
registra ataque
```

O sistema pode entender:

```text
houve construção ofensiva
```

sem exigir um clique obrigatório em levantamento.

## 6.2 Levantador ataca de segunda

Quando o jogador direciona intencionalmente a bola para pontuar:

```text
não tratar apenas como set
```

A ação terminal é:

```text
attack
```

Pode manter metadado:

```text
setter_attack = true
```

---

# 7. ATAQUE

Esta é uma das principais seções para inferência.

## 7.1 Ataque cai dentro

```text
attack
↓
bola toca o chão na quadra adversária
↓
attack #
winner = time atacante
rally encerrado
```

## 7.2 Ataque para fora sem toque

```text
attack
↓
bola termina fora
↓
nenhum toque adversário
↓
attack =
winner = adversário
rally encerrado
```

Não registrar bloqueio.

```text
blockTouch = false
```

## 7.3 Ataque para fora após resvalar no bloqueio

Caso central:

```text
attack
↓
bola toca o bloqueio
↓
bola termina fora
↓
ponto do time atacante
```

Registrar:

```text
attack #
winner = time atacante

metadata:
blockTouch = true
terminalCause = block_out
```

### Regra de inferência

Se:

```text
destino espacial = fora
+
vencedor do rally = time atacante
```

então:

```text
blockTouch = true
terminalCause = block_out
```

é uma inferência segura.

### NÃO fazer

Não criar automaticamente:

```text
block do atleta X
```

se o atleta não foi identificado.

## 7.4 Ataque toca no bloqueio e volta para o time atacante

```text
attack
↓
block touch
↓
bola volta
↓
cobertura
↓
rally continua
```

O bloqueio tocou na bola, mas não marcou ponto.

Registrar no ataque:

```text
blockTouch = true
terminal = false
```

Se houver captura específica de bloqueio no futuro, ela pode ser adicionada como enriquecimento.

## 7.5 Ataque é defendido normalmente

```text
attack
↓
dig adversária
↓
rally continua
```

O ataque não deve receber automaticamente:

```text
#
ou
=
```

Pode permanecer:

```text
!
```

ou outra avaliação já definida pelo perfil.

## 7.6 Ataque força defesa ruim

```text
attack
↓
defesa adversária perde controle
↓
adversário apenas devolve bola fácil
```

Quando o usuário toca:

```text
BOLA DE GRAÇA
```

o ataque anterior pode ser enriquecido para:

```text
attack +
```

Isso permite avaliar:

```text
ataques que não fizeram ponto
mas geraram vantagem clara
```

## 7.7 Ataque controlado pelo adversário

```text
attack
↓
dig confortável
↓
levantamento organizado
↓
contra-ataque normal
```

Não classificar como positivo só porque o rally continuou.

Pode permanecer:

```text
!
```

ou receber avaliação negativa conforme o perfil/manual.

---

# 8. BLOQUEIO

## 8.1 Bloqueio ponto

```text
attack adversário
↓
block
↓
bola volta e termina no chão do atacante
↓
ponto do time bloqueador
```

Resultado lógico:

```text
block #
winner = time bloqueador
```

O ataque adversário termina em erro/resultante negativa:

```text
attack =
```

Se ambos os contatos existirem no histórico, continuam pertencendo ao mesmo rally e ao mesmo ponto.

## 8.2 Toque de bloqueio sem ponto

```text
attack
↓
block touch
↓
defesa
↓
rally continua
```

Não considerar:

```text
block #
```

O toque pode ser salvo como:

```text
blockTouch = true
```

e o rally prossegue.

## 8.3 Ataque sai depois do bloqueio

```text
attack
↓
block touch
↓
bola fora
```

Ponto do ataque.

No Scout Trainer, preferir:

```text
attack #
terminalCause = block_out
blockTouch = true
```

e NÃO gerar automaticamente um erro individual para um bloqueador desconhecido.

## 8.4 Bloqueio sem tocar na bola

Tentativa de bloqueio não é contato.

Se:

```text
bloqueadores saltam
+
bola passa sem tocar
```

não fabricar um evento `block`.

O Scout Trainer atualmente registra fundamentos baseados em contato.

Tentativas podem virar outro tipo de dado tático no futuro.

## 8.5 Contato de bloqueio não conta como um dos três toques

Depois de tocar no bloqueio, o time bloqueador ainda pode usar:

```text
1º toque
2º toque
3º toque
```

Isso é importante para o motor do rally.

Fluxo válido:

```text
BLOCK TOUCH
↓
DIG
↓
SET
↓
ATTACK
```

---

# 9. DEFESA

## 9.1 Defesa mantém a bola

```text
attack
↓
dig
↓
set
↓
attack
```

Rally continua.

## 9.2 Defesa excelente

Defesa que permite construção ofensiva organizada pode ser:

```text
dig #
ou
dig +
```

conforme o perfil adotado.

Não derivar apenas da coordenada final sem regra específica.

## 9.3 Defesa vira bola de graça

```text
attack adversário
↓
dig ruim
↓
time defensor não consegue atacar
↓
devolve bola fácil
```

Registrar:

```text
free_ball
```

E qualificar a ação adversária anterior:

```text
previous attack → +
```

Esse enriquecimento deve ser reversível.

---

# 10. BOLA DE GRAÇA / FREE BALL

`free_ball` já é um fundamento do Scout Trainer.

Ela deve ter duas funções.

## Função 1 — registrar o contato atual

Exemplo:

```text
Time B devolveu uma bola sem ataque.
```

Registrar:

```text
team = B
skill = free_ball
```

## Função 2 — qualificar a pressão anterior

Exemplo:

```text
Time A atacou
↓
Time B se defendeu mal
↓
Time B devolveu bola de graça
```

Ao registrar `free_ball`:

```text
última ação de pressão do Time A = attack
↓
enriquecer para +
```

## 10.1 Regra segura para enriquecimento

Procurar para trás no rally:

```text
último contato adversário de pressão
```

Prioridade:

```text
attack
serve
```

Se existir e não houver outro evento que quebre a causalidade:

```text
qualificar como +
```

## 10.2 Não enriquecer automaticamente quando ambíguo

Exemplo:

```text
time possui bola controlada
↓
decide taticamente mandar bola de graça
```

Nesse caso não é necessariamente mérito da ação adversária anterior.

Se o contexto não for claro:

```text
registrar apenas free_ball
```

sem modificar evento anterior.

---

# 11. RALLY E PRÓXIMA AÇÃO ESPERADA

Sugestões devem ser contextuais, nunca bloqueios rígidos.

Fluxo comum:

```text
SAQUE
↓
RECEPÇÃO
↓
ATAQUE
↓
DEFESA
↓
ATAQUE
↓
...
```

Levantamentos podem ser implícitos no modo gestual.

## Exceções importantes

### Recepção atravessa diretamente

```text
serve
↓
reception overpass
↓
attack adversário
```

Não sugerir obrigatoriamente `set`.

### Ataque termina rally

```text
attack #
ou
attack =
```

Não sugerir defesa.

### Block-out

```text
attack #
+
destination = fora
+
blockTouch
```

Rally termina.

### Bloqueio ponto

```text
block #
```

Rally termina.

### Free ball

```text
free_ball
↓
oponente recebe situação confortável
```

Próxima ação pode ser construção ofensiva adversária.

---

# 12. ROTAÇÃO E SAQUE

Para sugestões de jogador:

```text
P1 = posição de saque
```

## Time sacador ganha o rally

```text
ponto
↓
continua sacando
↓
não gira
```

## Time receptor ganha o rally

```text
ponto
+
direito de sacar
↓
gira uma posição no sentido horário
↓
novo jogador chega à P1
↓
esse jogador saca
```

A UI pode sugerir automaticamente o atleta em P1.

Nunca bloquear seleção manual por causa da sugestão.

---

# 13. ÁREA FORA DA QUADRA

A quadra gestual precisa distinguir:

```text
court
outZone
serviceZone
```

A área `outZone` serve para representar visualmente:

```text
saque fora
ataque fora
bola desviada para fora
```

## Importante

A coordenada espacial sozinha não determina o vencedor.

Exemplo:

```text
attack → outZone
```

pode significar:

### sem toque

```text
attack =
ponto adversário
```

### com block touch

```text
attack #
block_out
ponto atacante
```

Portanto:

```text
posição + vencedor/contexto
```

é que permite a inferência.

---

# 14. MATRIZ RÁPIDA DE INFERÊNCIA

| Situação observada | Resultado | Inferência permitida |
|---|---|---|
| Ataque cai dentro | ponto atacante | `attack #` |
| Ataque fora + ponto adversário | ponto adversário | `attack =`, sem bloqueio |
| Ataque fora + ponto atacante | ponto atacante | `attack #`, `blockTouch=true`, `block_out` |
| Ataque → defesa normal | rally continua | ataque não terminal |
| Ataque → defesa ruim → free ball | rally continua | ataque anterior pode virar `+` |
| Bloqueio devolve direto ao chão atacante | ponto bloqueador | `block #` |
| Bloqueio toca e bola continua | rally continua | `blockTouch=true` |
| Saque fora | ponto receptor | `serve =` |
| Saque ace | ponto sacador | `serve #`, `ace` |
| Saque toca rede e entra | rally continua | não é erro |
| Recepção não mantém bola em jogo | ponto sacador | `reception =` |
| Recepção atravessa e adversário ataca | rally continua | não inventar `set` |
| Defesa ruim → free ball | rally continua | pressão adversária anterior pode virar `+` |

---

# 15. INFERÊNCIAS QUE O SISTEMA PODE FAZER

Pode inferir:

```text
vencedor do rally
terminalidade
block-out
toque de bloqueio implícito em block-out
erro de ataque fora sem toque
erro de saque fora
próximo time com posse lógica
rotação após sideout
sacador da P1
qualificação positiva causada por free ball quando causalidade for clara
```

---

# 16. INFERÊNCIAS QUE O SISTEMA NÃO DEVE FAZER

Não inferir automaticamente:

```text
qual atleta bloqueou
quantos bloqueadores saltaram
qual jogador defendeu se não foi selecionado
qual atleta levantou em levantamento implícito
tipo de ataque pela trajetória
qualidade #/+/- apenas pela coordenada
intenção tática
responsabilidade individual em jogada ambígua
```

---

# 17. PRINCÍPIO DE EVENTOS DERIVADOS

Preferir:

```text
evento observado
+
metadata derivada
```

em vez de:

```text
inventar vários eventos que o usuário não registrou
```

Exemplo ideal:

```ts
attack {
  evaluation: "#",
  spatial: {
    origin,
    destination: outZone
  },
  derived: {
    blockTouch: true,
    terminalCause: "block_out"
  }
}
```

Em vez de criar automaticamente:

```text
attack
block do jogador desconhecido
ball_out
point
```

como quatro ações independentes.

O motor da partida pode derivar placar e contexto a partir do evento canônico.

---

# 18. ENRIQUECIMENTO TARDIO

Algumas informações só aparecem depois.

Exemplo:

```text
ataque
↓
defesa
↓
free ball
```

No momento do ataque:

```text
evaluation = !
```

Depois da free ball:

```text
ataque anterior pode ser enriquecido para +
```

Usar o mecanismo existente de correção/enriquecimento.

Não apagar o histórico original de maneira destrutiva.

---

# 19. PRIORIDADE PARA A INTERFACE MOBILE

Durante jogo real, minimizar decisões.

## Sempre acessível

```text
#
=
DESFAZER
```

## Contextual/semi-acessível

```text
BOLA DE GRAÇA
TOQUE NO BLOQUEIO
FORA
```

Mas sempre que o contexto permitir inferir, evitar perguntar.

Exemplo:

```text
ataque marcado para fora
+
usuário toca PONTO DO MEU TIME
```

Não perguntar novamente:

```text
"tocou no bloqueio?"
```

Inferir:

```text
block_out
```

---

# 20. EXEMPLOS COMPLETOS

## Exemplo A — ataque simples ponto

```text
A #7 ataca
↓
bola cai dentro
↓
Time A pontua
```

```text
attack #
winner=A
```

## Exemplo B — ataque para fora

```text
A #7 ataca
↓
bola sai
↓
Time B pontua
```

```text
attack =
winner=B
blockTouch=false
```

## Exemplo C — block-out

```text
A #7 ataca
↓
bola resvala no bloqueio
↓
bola sai
↓
Time A pontua
```

```text
attack #
winner=A
blockTouch=true
terminalCause=block_out
```

## Exemplo D — bloqueio ponto

```text
A #7 ataca
↓
B #3 bloqueia
↓
bola cai no lado A
↓
Time B pontua
```

Se ambos os atletas foram observados:

```text
A #7 attack =
B #3 block #
winner=B
```

Mesmo rally, apenas um ponto.

## Exemplo E — ataque cria free ball

```text
A #7 attack
↓
B #4 dig ruim
↓
B devolve free_ball
↓
A recebe vantagem
```

Registro:

```text
B free_ball
```

Enriquecimento:

```text
A #7 attack → +
```

## Exemplo F — recepção overpass

```text
A serve
↓
B recebe
↓
bola passa rente à rede
↓
A ataca direto
```

Não inserir:

```text
B set
```

Fluxo:

```text
serve A
reception B
attack A
```

---

# 21. REGRA PARA O LUNA/CODEX

Quando uma macroetapa disser:

```text
consulte o guia de semântica
```

fazer:

1. localizar somente o fundamento necessário;
2. aplicar somente as regras daquela seção;
3. não auditar o domínio inteiro;
4. não tentar implementar todas as exceções deste documento;
5. não criar novos enums se metadata existente resolver;
6. não criar eventos sintéticos de atletas desconhecidos;
7. implementar a menor alteração necessária;
8. testar somente os casos descritos na macroetapa;
9. PARAR.

---

# 22. REFERÊNCIA DE REGRAS

Base de regras de jogo utilizada para os casos fundamentais:

```text
FIVB Official Volleyball Rules 2025–2028

8.4  — Ball Out
13.3 — Faults of the Attack Hit
14.1 — Blocking
14.2 — Block Contact
14.4 — Block and Team Hits
14.6 — Blocking Faults
```

Para o Scout Trainer, essas regras oficiais definem o resultado do rally.

As classificações:

```text
#
+
!
-
/
=
```

e as inferências de vantagem são **convenções analíticas do Scout Trainer** e devem permanecer separadas da regra oficial do jogo.

---

# 23. RESUMO DO MOTOR

```text
AÇÃO OBSERVADA
      ↓
GEOMETRIA / RESULTADO
      ↓
RALLY TERMINOU?
  ┌───┴────┐
 SIM      NÃO
  ↓        ↓
VENCEDOR  PRÓXIMA AÇÃO
  ↓        ↓
CAUSA     CONTEXTO
  ↓        ↓
INFERÊNCIA SEGURA
      ↓
EVENTO CANÔNICO
      ↓
PLACAR / ROTAÇÃO / ANALYTICS
```

A inteligência do sistema deve estar principalmente aqui:

```text
contexto + resultado → inferência segura
```

e não em obrigar o usuário a apertar dezenas de botões.
