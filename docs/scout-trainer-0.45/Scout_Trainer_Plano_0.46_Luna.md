# Scout Trainer — Plano de Implementação 0.46
## Motor de eventos, bloqueio e leitura de sequências

### Objetivo da versão

Esta versão deve melhorar três pontos do Scout Trainer sem ampliar demais o escopo:

1. **Normalizar ações, avaliações e infrações**, permitindo `#` e `=` em todas as ações e tratando corretamente erros que geram ponto direto.
2. **Melhorar o registro de bloqueio e a leitura visual dos ataques**, preservando o fluxo rápido de registro.
3. **Reformular a tela de Sequências/Markov**, transformando tabelas técnicas em uma leitura útil para treinador e analista.

A implementação deve ser feita em **3 etapas independentes**.  
Cada etapa deve ser concluída, testada e revisada antes da próxima.

---

# Regras gerais para o Luna

Estas regras valem para as três etapas:

- Executar **somente a etapa solicitada**.
- Não iniciar automaticamente a etapa seguinte.
- Antes de alterar código, identificar os componentes, tipos e serviços já existentes relacionados ao problema.
- Reutilizar componentes existentes sempre que possível.
- Evitar refatorações amplas.
- Não adicionar dependências sem necessidade real.
- Preservar compatibilidade com partidas antigas.
- Não alterar o sistema de coordenadas espaciais sem necessidade.
- Não alterar fórmulas estatísticas existentes sem uma justificativa explícita.
- Não duplicar componentes de quadra.
- Preferir mudanças pequenas, modulares e testáveis.
- Atualizar testes existentes e criar apenas os testes necessários para os novos comportamentos.
- Ao concluir cada etapa, informar:
  1. arquivos alterados;
  2. comportamento implementado;
  3. decisões de arquitetura;
  4. testes executados;
  5. pendências ou riscos encontrados.

---

# ETAPA 1 — Motor de ações, avaliações e infrações

## Objetivo

Separar claramente quatro conceitos:

- **ação técnica**
- **avaliação da ação**
- **infração**
- **resultado do rally**

A interface deve permitir `#` e `=` em todas as ações técnicas, mas sem assumir que esses símbolos possuem a mesma consequência para todas elas.

---

## 1. Avaliação em todas as ações

Todas as ações técnicas registráveis devem aceitar:

- `#`
- avaliação neutra
- `=`

Exemplos:

```text
Saque
#  neutro  =

Recepção
#  neutro  =

Ataque
#  neutro  =

Defesa
#  neutro  =

Levantamento
#  neutro  =

Bola de graça
#  neutro  =
```

O sistema não deve utilizar uma regra global do tipo:

```text
# = ponto
= = ponto adversário
```

A consequência deve depender de:

```text
ação + avaliação
```

---

## 2. Regras mínimas de consequência

### Saque

```text
Saque #
→ ace
→ ponto da equipe sacadora
→ rally encerrado
```

```text
Saque =
→ erro de saque
→ ponto adversário
→ rally encerrado
→ saque adversário
```

### Ataque

```text
Ataque #
→ ponto da equipe atacante
→ rally encerrado
```

```text
Ataque =
→ erro de ataque
→ ponto adversário
→ rally encerrado
```

### Recepção

```text
Recepção #
→ excelente
→ rally continua
```

```text
Recepção =
→ erro de recepção / ace sofrido
→ ponto adversário
→ rally encerrado
```

### Defesa

```text
Defesa #
→ excelente
→ rally continua
```

```text
Defesa =
→ erro de defesa
→ ponto adversário
→ rally encerrado
```

### Levantamento

```text
Levantamento #
→ ação excelente
→ rally continua
```

```text
Levantamento =
→ erro que encerra a jogada
→ ponto adversário
```

Se já existir uma regra diferente no domínio atual para alguma ação, preservar a regra existente e documentar a divergência antes de alterá-la.

---

## 3. Infrações

Adicionar a categoria de eventos:

- toque na rede;
- invasão;
- dois toques;
- erro de rotação.

Esses eventos possuem comportamento especial.

### Comportamento obrigatório

Ao registrar uma infração:

1. não solicitar trajetória;
2. não solicitar origem/destino;
3. não abrir a quadra espacial;
4. registrar a infração;
5. encerrar imediatamente o rally;
6. dar um ponto ao adversário;
7. definir o adversário como equipe sacadora;
8. atualizar rotação utilizando o mecanismo já existente;
9. permitir atleta opcional quando fizer sentido.

Exemplo de domínio:

```ts
type FaultType =
  | 'net_touch'
  | 'invasion'
  | 'double_touch'
  | 'rotation_error'

type FaultEvent = {
  type: 'fault'
  faultType: FaultType
  teamId: string
  athleteId?: string
  terminal: true
  pointFor: string
}
```

A estrutura exata pode seguir os tipos já existentes no projeto.

Não criar coordenadas artificiais para infrações.

---

## 4. Interface

Dentro de **Outras ações**, criar uma área clara para infrações:

```text
INFRAÇÕES

Toque na rede
Invasão
Dois toques
Erro de rotação
```

Ao selecionar uma infração:

```text
Dois toques — Olympico
Ponto: Sada

[Desfazer]                  [Registrar]
```

O usuário não deve ser enviado para a quadra.

---

## 5. Undo obrigatório

Eventos terminais automáticos devem ser completamente reversíveis.

`Desfazer` precisa restaurar:

- placar;
- equipe sacadora;
- rotação;
- estado do rally;
- último evento;
- qualquer consequência automática da infração ou avaliação.

---

## 6. Compatibilidade

Partidas antigas devem continuar funcionando.

Campos novos devem aceitar ausência de valor.

Não executar migração destrutiva de dados.

---

## 7. Critérios de aceite

A etapa só está concluída quando:

- `#` e `=` aparecem em todas as ações técnicas;
- ações neutras continuam possíveis;
- saque `#` e `=` funcionam;
- ataque `#` e `=` funcionam;
- recepção `#` e `=` funcionam;
- defesa `#` e `=` funcionam;
- toque na rede gera ponto adversário;
- invasão gera ponto adversário;
- dois toques gera ponto adversário;
- erro de rotação gera ponto adversário;
- nenhuma infração solicita trajetória;
- saque troca corretamente após o ponto;
- rotação permanece consistente;
- undo restaura o estado anterior;
- partidas antigas continuam abrindo.

---

# PROMPT — ETAPA 1

```text
Leia primeiro o código atual do Scout Trainer e identifique:
- modelo de eventos;
- ações disponíveis;
- regras atuais de pontuação;
- mecanismo de rally;
- mecanismo de saque;
- mecanismo de rotação;
- implementação de undo;
- componentes usados no registro de ações.

Implemente SOMENTE a ETAPA 1 do arquivo de plano da versão 0.46.

OBJETIVO
Separar ação técnica, avaliação, infração e resultado do rally.

REQUISITOS

1. Disponibilizar #, avaliação neutra e = para todas as ações técnicas registráveis.

2. Não criar uma regra global "# = ponto" e "= = ponto adversário".
A consequência deve depender da combinação ação + avaliação.

Regras mínimas:

Saque #
- ponto da equipe sacadora
- encerra rally

Saque =
- ponto adversário
- encerra rally
- saque passa ao adversário

Ataque #
- ponto da equipe atacante
- encerra rally

Ataque =
- ponto adversário
- encerra rally

Recepção #
- rally continua

Recepção =
- ponto adversário
- encerra rally

Defesa #
- rally continua

Defesa =
- ponto adversário
- encerra rally

Levantamento #
- rally continua

Levantamento =
- ponto adversário
- encerra rally

Se o domínio atual possuir alguma regra diferente, preserve o comportamento existente quando necessário e documente antes de mudar.

3. Criar infrações:
- toque na rede
- invasão
- dois toques
- erro de rotação

Toda infração:
- NÃO possui trajetória;
- NÃO solicita origem/destino;
- NÃO abre quadra;
- encerra o rally;
- dá ponto ao adversário;
- passa o saque ao adversário;
- utiliza o mecanismo atual de rotação;
- pode ter atleta associado opcionalmente.

4. Não criar coordenadas fictícias para infrações.

5. Garantir UNDO completo.
Desfazer deve restaurar:
- placar;
- saque;
- rotação;
- rally;
- evento anterior;
- consequências automáticas.

6. Preservar partidas antigas.

RESTRIÇÕES
- Não implementar bloqueio nesta etapa.
- Não alterar a tela de Sequências.
- Não refatorar áreas não relacionadas.
- Não adicionar bibliotecas sem necessidade.
- Reutilizar tipos e serviços existentes sempre que possível.

TESTES MÍNIMOS
Testar:
- saque #
- saque =
- ataque #
- ataque =
- recepção #
- recepção =
- defesa #
- defesa =
- toque na rede para as duas equipes
- invasão para as duas equipes
- dois toques para as duas equipes
- erro de rotação para as duas equipes
- undo após evento terminal

AO FINAL
Informe:
1. arquivos alterados;
2. estrutura de domínio adotada;
3. regras de consequência implementadas;
4. testes executados;
5. riscos ou inconsistências encontradas.

Não inicie a Etapa 2.
```

---

# ETAPA 2 — Bloqueio + leitura visual das ações

## Objetivo

Melhorar o registro de bloqueio sem deixar o fluxo de scout lento e tornar a leitura espacial das ações imediatamente compreensível.

---

## 1. Bloqueio dentro do ataque

Ao registrar um ataque, disponibilizar um controle compacto:

```text
BLOQUEIO

Sem bloqueio
Ponto de bloqueio
Bloqueio explorado
Bloqueio amortecido
```

`Sem bloqueio` deve ser o padrão.

O usuário que não quiser registrar bloqueio não deve ganhar cliques extras.

---

## 2. Resultados possíveis

### Ponto de bloqueio

```text
Ataque
→ bloqueio adversário
→ ponto da equipe defensora
→ rally encerrado
```

Não classificar automaticamente como `Ataque =`.

O ataque bloqueado deve ser distinguível de um erro de ataque.

---

### Bloqueio explorado

```text
Ataque
→ atacante explora o bloqueio
→ ponto da equipe atacante
→ rally encerrado
```

---

### Bloqueio amortecido

```text
Ataque
→ toque no bloqueio
→ bola permanece jogável
→ rally continua
```

---

## 3. Bloqueadores

Quando houver bloqueio:

- permitir registrar atleta bloqueador;
- permitir mais de um bloqueador, se a estrutura atual suportar;
- priorizar visualmente os atletas da rede da equipe defensora;
- disponibilizar opção de outros atletas apenas se necessário.

Exemplo:

```ts
block?: {
  outcome: 'point' | 'tool' | 'soft_touch'
  blockerIds: string[]
}
```

A estrutura deve se adaptar ao domínio existente.

---

## 4. Bloqueio como metadado do ataque

Não transformar o bloqueio em uma ação manual independente dentro do rally se isso duplicar eventos.

Preferir armazená-lo como informação relacionada ao ataque e derivar estados analíticos depois.

Exemplo:

```text
Ataque
→ bloqueio amortecido
→ defesa
```

pode ser derivado posteriormente para a análise de sequência.

---

## 5. Marcadores espaciais

A quadra usada em Análise deve distinguir visualmente:

- `#`
- neutro
- `=`

Sugestão:

```text
● verde = #
◆ amarelo = neutro
✕ vermelho = =
```

Importante:

- usar cor + formato;
- não depender apenas de cor;
- manter legibilidade em PDF;
- preservar filtros existentes;
- reutilizar o componente de quadra atual.

---

## 6. Tooltip

Ao passar o mouse ou tocar em um registro, mostrar:

```text
#07 Jogador 7
Ataque
Avaliação: #
Zona 4 → Zona 1
Bloqueio explorado por #11
```

Exibir apenas informações disponíveis.

---

## 7. Trajetórias

Quando o modo **Trajetórias** estiver ativo:

- preservar as linhas já existentes;
- permitir que a categoria visual siga a avaliação da ação;
- não modificar o sistema de coordenadas.

---

## 8. Critérios de aceite

- ataque sem bloqueio continua rápido;
- ponto de bloqueio encerra o rally corretamente;
- bloqueio explorado encerra para o ataque;
- bloqueio amortecido mantém o rally;
- bloqueador fica salvo;
- bloqueio e erro de ataque continuam conceitos diferentes;
- marcadores `#`, neutro e `=` são visualmente distinguíveis;
- filtros continuam funcionando;
- tooltip funciona;
- quadra existente é reutilizada;
- partidas antigas continuam funcionando.

---

# PROMPT — ETAPA 2

```text
Leia o plano da versão 0.46 e o código já implementado na Etapa 1.

Implemente SOMENTE a ETAPA 2.

OBJETIVO
Adicionar registro estruturado de bloqueio ao ataque e melhorar a leitura visual das ações na quadra.

PARTE A — BLOQUEIO

Ao registrar um ataque, disponibilizar:

- Sem bloqueio
- Ponto de bloqueio
- Bloqueio explorado
- Bloqueio amortecido

Sem bloqueio deve ser o padrão.

Não adicionar cliques extras ao fluxo normal quando o usuário não quiser registrar bloqueio.

REGRAS

Ponto de bloqueio:
- ponto da equipe defensora;
- encerra rally;
- NÃO deve ser automaticamente classificado como erro de ataque.

Bloqueio explorado:
- ponto da equipe atacante;
- encerra rally.

Bloqueio amortecido:
- rally continua.

Permitir registrar o(s) bloqueador(es).

Priorizar na interface os atletas atualmente na rede da equipe defensora.

Guardar o bloqueio como dado relacionado ao ataque, evitando criar duplicação desnecessária de eventos.

Preservar compatibilidade com partidas antigas.

PARTE B — QUADRA

Reutilizar o componente de quadra existente.

Distinguir visualmente:

#      -> círculo
neutro -> losango
=      -> X

Usar também diferenciação de cor conforme o design atual:
#      -> verde
neutro -> amarelo
=      -> vermelho

Não depender apenas de cor.

Adicionar legenda curta acima da quadra.

Adicionar tooltip/touch detail com:
- atleta;
- ação;
- avaliação;
- origem/destino;
- informação de bloqueio quando existir.

Preservar:
- filtros;
- trajetórias;
- sistema atual de coordenadas;
- exportações existentes.

RESTRIÇÕES
- Não alterar ainda a tela de Sequências/Markov.
- Não criar uma nova implementação de quadra.
- Não alterar fórmulas estatísticas.
- Não fazer refatoração ampla.
- Não adicionar dependência visual sem necessidade.

TESTES MÍNIMOS

Testar:
- ataque sem bloqueio;
- ponto de bloqueio;
- bloqueio explorado;
- bloqueio amortecido;
- seleção de bloqueador;
- partida antiga sem campo block;
- marcador #;
- marcador neutro;
- marcador =;
- filtros;
- tooltip;
- trajetórias.

AO FINAL
Informe:
1. arquivos alterados;
2. estrutura usada para bloqueio;
3. consequências de cada tipo de bloqueio;
4. mudanças visuais;
5. testes executados;
6. pendências encontradas.

Não inicie a Etapa 3.
```

---

# ETAPA 3 — Reformulação de Sequências / Markov

## Objetivo

Manter a base estatística atual, mas transformar a tela de Sequências em uma leitura compreensível para treinador e analista.

A tela não deve exigir que o usuário saiba interpretar nomes internos como:

```text
attack -> defense
terminal_win
free_ball
```

---

## 1. Linguagem humana

Traduzir os estados internos apenas na apresentação.

Exemplos:

```text
attack
→ Ataque

defense
→ Defesa

serve
→ Saque

reception
→ Recepção

free_ball
→ Bola de graça

terminal_win
→ Ponto

terminal_loss
→ Ponto adversário
```

Os estados internos podem continuar em inglês no domínio.

---

## 2. Nova leitura das transições

Substituir a tabela técnica atual por algo próximo de:

| Sequência | Vezes | Resultado observado | Impacto | Confiança |
|---|---:|---:|---:|---|
| Ataque → Defesa adversária | 5 | 17,9% | +3,6 p.p. | Baixa |
| Ataque → Ponto | 8 | 28,6% | — | Média |
| Saque → Recepção | 22 | 68,8% | -7,4 p.p. | Boa |

Os valores devem continuar vindo dos cálculos atuais.

---

## 3. Explicar os números

Não exibir apenas:

```text
+3,6%
```

Disponibilizar tooltip ou texto explicativo.

Exemplo:

```text
Quando essa sequência aconteceu, o resultado observado ficou
3,6 pontos percentuais acima da referência usada pelo cálculo.
```

Antes de escrever qualquer explicação, identificar no código o que exatamente significa:

- baseline;
- valor observado;
- probabilidade;
- diferença.

Não alterar a fórmula apenas para combinar com o texto.

---

## 4. Amostra pequena

Substituir textos técnicos como:

```text
n=1: amostra pequena
```

por um badge:

```text
⚠ Poucos casos
```

Tooltip:

```text
Resultado baseado em poucas ocorrências.
Evite tirar conclusões fortes a partir deste padrão.
```

Preservar o `n` acessível em detalhe ou tooltip.

---

## 5. Destaques da partida

Acima da tabela, mostrar no máximo 3 achados:

```text
Mais frequente
Saque → Recepção → Ataque
22 rallies

Mais favorável
Defesa → Ataque
+X p.p. em relação à referência

Atenção
Ataque → Bloqueio adversário
Y ocorrências
```

Gerar somente quando houver dados suficientes.

Não inventar interpretação causal.

---

## 6. Quadra para sequências

A seção espacial deve reutilizar a mesma quadra das outras telas.

Remover ou substituir o retângulo genérico atual.

Ao selecionar uma sequência, mostrar na quadra os eventos relacionados.

Exemplo:

```text
ATAQUE → DEFESA

┌─────────────────────────────────────┐
│             ● ─────────→ ◆          │
│                                     │
│      ● ─────────────→ ◆             │
│                         ↗           │
│             ● ────────              │
└─────────────────────────────────────┘
```

Nesta etapa:

- não criar visualização excessivamente sofisticada;
- não criar Sankey;
- não criar grafo de rede complexo;
- não criar animação;
- não criar espessura por frequência se isso exigir muito código.

Prioridade: compreensão.

---

## 7. Incorporar novos eventos

Quando existirem dados, a leitura deve conseguir distinguir:

```text
Ataque
→ Bloqueio amortecido
→ Defesa
```

```text
Ataque
→ Bloqueio adversário
→ Ponto adversário
```

```text
Recepção
→ Dois toques
→ Ponto adversário
```

```text
Defesa =
→ Ponto adversário
```

Não é necessário alterar o motor Markov inteiro se a camada atual já consegue derivar esses estados.

Preferir adaptação incremental.

---

## 8. Critérios de aceite

- nenhum estado interno incompreensível aparece na UI principal;
- cálculos atuais permanecem consistentes;
- sequências possuem nomes legíveis;
- impacto possui explicação;
- amostra pequena possui alerta claro;
- existe resumo com até três achados;
- a quadra usada é o componente visual padrão do projeto;
- selecionar sequência filtra/mostra eventos relacionados;
- novos dados de bloqueio e infrações podem aparecer quando existentes;
- nenhuma interpretação causal é inventada.

---

# PROMPT — ETAPA 3

```text
Leia o plano da versão 0.46, o código atual da tela de Sequências e as implementações concluídas nas Etapas 1 e 2.

Implemente SOMENTE a ETAPA 3.

OBJETIVO
Transformar a tela de Sequências/Markov em uma leitura compreensível para treinador e analista, preservando a matemática existente.

ANTES DE ALTERAR A UI

Identifique no código:
- como as transições são calculadas;
- o significado de "probabilidade";
- o significado de "valor observado";
- o significado de "baseline";
- como a diferença em relação ao baseline é calculada;
- como padrões de 2 e 3 estados são gerados;
- como pequenas amostras são identificadas.

Não altere essas fórmulas sem necessidade.

PARTE A — LINGUAGEM

Na camada visual, converter estados internos em nomes humanos.

Exemplos:
serve -> Saque
reception -> Recepção
attack -> Ataque
defense -> Defesa
free_ball -> Bola de graça
terminal_win -> Ponto
terminal_loss -> Ponto adversário

Não é necessário renomear enums internos.

PARTE B — TABELA

Reformular a apresentação para algo semelhante a:

Sequência
Vezes
Resultado observado
Impacto
Confiança

Substituir nomes técnicos por frases de jogo.

Explicar impacto em tooltip ou detalhe.

A explicação deve refletir a fórmula real encontrada no código.

Não utilizar linguagem causal.

PARTE C — AMOSTRA

Substituir "n=1: amostra pequena" na interface principal por:

⚠ Poucos casos

Manter o número de ocorrências acessível em tooltip ou detalhe.

PARTE D — RESUMO

Criar no máximo três destaques quando houver dados suficientes:

- padrão mais frequente;
- padrão mais favorável;
- padrão de atenção.

Não gerar destaque com amostra insuficiente.
Não afirmar causalidade.

PARTE E — QUADRA

Substituir a visualização espacial genérica atual pelo mesmo componente de quadra utilizado nas outras análises.

Ao selecionar uma sequência, mostrar os eventos espaciais associados.

Reutilizar coordenadas existentes.

Não criar:
- Sankey;
- grafo de rede complexo;
- animação;
- nova biblioteca de visualização;
- nova implementação de quadra.

PARTE F — NOVOS EVENTOS

Quando os dados existirem, permitir leitura de sequências como:

Ataque -> Bloqueio amortecido -> Defesa
Ataque -> Bloqueio adversário -> Ponto adversário
Recepção -> Dois toques -> Ponto adversário
Defesa = -> Ponto adversário

Não reescrever o motor inteiro se for possível adaptar o pipeline atual.

RESTRIÇÕES
- preservar fórmulas;
- preservar dados antigos;
- evitar refatoração ampla;
- não inventar causalidade;
- não adicionar dependência sem necessidade.

TESTES MÍNIMOS

Testar:
- tradução visual dos estados;
- tabela com transição de 2 estados;
- padrão de 3 estados;
- badge de pequena amostra;
- tooltip de impacto;
- resumo com dados suficientes;
- ausência de resumo com dados insuficientes;
- seleção de sequência;
- quadra filtrada;
- sequência contendo bloqueio;
- sequência contendo infração.

AO FINAL
Informe:
1. arquivos alterados;
2. significado encontrado para cada métrica atual;
3. alterações de UI;
4. como a quadra foi reutilizada;
5. testes executados;
6. limitações que ainda permanecem.

Não implementar funcionalidades além desta etapa.
```

---

# Ordem recomendada de execução

```text
1. Etapa 1 — Motor de eventos
   ↓
   testar uma partida completa
   ↓
2. Etapa 2 — Bloqueio + visual
   ↓
   testar registro + análise espacial
   ↓
3. Etapa 3 — Sequências/Markov
   ↓
   revisar interpretação dos resultados
```

Não executar as três etapas em um único prompt.

---

# Resultado esperado da versão 0.46

Ao final, o Scout Trainer deve:

- registrar ações técnicas com maior liberdade;
- diferenciar erro técnico de infração;
- registrar infrações sem trajetória;
- atualizar placar, saque e rotação automaticamente;
- permitir undo seguro;
- registrar bloqueio com contexto;
- diferenciar bloqueio de erro de ataque;
- mostrar `#`, neutro e `=` claramente na quadra;
- apresentar sequências em linguagem esportiva;
- reutilizar a quadra como linguagem visual comum do sistema;
- tornar as análises de transição úteis para decisões futuras;
- preparar a base para análises mais avançadas de Markov e IA sem tornar o registro da partida mais lento.
