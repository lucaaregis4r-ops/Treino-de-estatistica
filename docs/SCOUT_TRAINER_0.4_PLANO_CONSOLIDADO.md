# SCOUT TRAINER 0.4 — PLANO CONSOLIDADO
## Interface, fluidez, robustez a erros, scout parcial, rotações e análises

> Este documento substitui os dois planos anteriores como fonte única de execução da versão 0.4.
> Base: plano de refinamento já iniciado + adendo de robustez a erros.
> Trabalhar sobre o checkout local atual. Não fazer reset para o GitHub. Não reimplementar o que já funciona.

---

# ESTADO ATUAL

- A primeira parte do plano de refinamento já foi implementada pelo usuário.
- Tratar M0/M1 como já executadas ou em fase final de validação local.
- Antes de continuar, apenas confirmar rapidamente o que está realmente pronto no checkout local.
- Próxima macro recomendada: **atualizar os testes legados de `AppFlow` e fechar a validação**.
- Depois disso, implementar a camada de robustez a erros antes de análises e relatórios.

---

# PRINCÍPIOS DA 0.4

1. Um erro humano não pode destruir a sequência da partida.
2. Até pressionar **Enter**, a ação atual é apenas um rascunho.
3. Enter registra exatamente uma ação.
4. Esc cancela apenas o rascunho atual.
5. Desfazer atua sobre evento já registrado e recompõe o estado.
6. Correções preservam histórico; evitar edição destrutiva.
7. Placar oficial e scout técnico são relacionados, mas não são a mesma coisa.
8. A quadra precisa conhecer a orientação física das equipes.
9. Visual, Digitado, Híbrido e Gestual continuam usando o mesmo pipeline canônico.
10. Não criar novo banco, novo histórico ou novo tipo persistente paralelo para o Gestual.
11. Não implementar mobile nesta rodada.
12. Uma macroetapa por solicitação.

---

# ARQUITETURA-ALVO

```text
INPUT
mouse / touch / teclado
        ↓
DRAFT DA AÇÃO
trajetória + equipe + atleta? + qualidade?
        ↓
CONTROLLER
        ↓
VALIDAÇÃO
        ↓
EVENTO CANÔNICO
        ↓
EVENT LOG
        ↓
PROJECTOR / REPLAY
        ↓
MATCH STATE
placar + rally + saque + rotação + contexto
        ↓
UI / ANALYTICS / RELATÓRIO
```

Nunca:

```text
UI
↓
muta placar diretamente
↓
muta rotação diretamente
↓
muta rally diretamente
```

---

# SEQUÊNCIA CONSOLIDADA

| Macro | Entrega | Situação |
| --- | --- | --- |
| M0 | Reconhecimento curto | já executada / validar localmente |
| M1 | Interface reorganizada | já executada / validar localmente |
| M2 | Fluidez, estados e Enter | concluída em 12/09/2026 |
| M3 | Histórico corrigível + reprojeção segura | concluída em 12/09/2026 |
| M4 | Placar manual + corrigir último rally + override | concluída em 12/09/2026 |
| M5 | Saque completo + orientação física da quadra | concluída em 12/09/2026 |
| M6 | Sem atleta + scout de uma equipe | concluída em 12/09/2026 |
| M7 | Trocas rápidas na rotação | concluída em 12/09/2026 |
| M8 | Análises persistentes | concluída em 12/09/2026 |
| M9 | Relatório com gráficos selecionados | concluída em 12/09/2026 |
| M10 | Validação integrada e fechamento | validação parcial; pendem 6 testes legados de UI |

---

# M0 — RECONHECIMENTO CURTO
## Status
Já executada ou incorporada à primeira rodada.

Se houver dúvida, apenas confirmar:
- implementação gestual local;
- scripts existentes;
- arquivos reais;
- versão atual do banco;
- status do plano local.

Não repetir auditoria.

---

# M1 — INTERFACE REORGANIZADA
## Status
Primeira parte já implementada.

Preservar o que já foi melhorado:
- layout mais compacto;
- quadra central;
- controles agrupados;
- rotação lateral;
- placar principal único;
- redução de rolagem;
- identidade visual 0.4.

Não recomeçar essa macro.
Apenas corrigir regressões visuais encontradas nas macros seguintes.

---

# M2 — FLUIDEZ, ESTADOS E ENTER

## Objetivo
Transformar o modo Gestual em um fluxo rápido e previsível.

## Estado mínimo

```text
awaiting_gesture
awaiting_player
ready_to_commit
committing
error
```

Não exibir nomes internos na UI.

Exemplos:

```text
AGORA
DEFESA — EQUIPE A

Trace a trajetória da bola
```

```text
Trajetória pronta
Escolha quem defendeu
```

```text
#12 Jogador 12
Pronto para registrar
ENTER
```

## Enter

```text
gesto
↓
atleta, se necessário
↓
qualidade, se necessário
↓
ENTER
↓
1 commit
```

Regras:
- key repeat não duplica;
- Enter durante `committing` é ignorado;
- Enter sem informação obrigatória não registra;
- erro de persistência mantém o draft;
- após sucesso, limpar draft e avançar;
- clique/toque/tecla apenas selecionam; não registram automaticamente.

## Esc

```text
ESC
→ limpa somente draft atual
```

## Aceite
- 10 ações com Enter = 10 eventos;
- nenhum duplo registro;
- estado selecionado permanece claro;
- mensagens de erro são específicas;
- sequência curta de rally continua correta.

---

# M3 — HISTÓRICO CORRIGÍVEL E REPROJEÇÃO SEGURA

## Objetivo
Tornar a partida tolerante a erros humanos.

## Regra central

```text
ERRO
↓
CORREÇÃO LOCAL
↓
REPROJEÇÃO
↓
PARTIDA CONTINUA
```

## Correção não destrutiva
Preferir mecanismos de correção já existentes. Não apagar o evento original.

```text
evento original
+
correção
=
estado efetivo atual
```

## Últimas ações
Criar histórico compacto com:

```text
Editar
Desfazer
```

Editar apenas:
- equipe;
- atleta;
- fundamento;
- qualidade;
- origem;
- destino.

## Reprojeção
Ao corrigir um evento:

```text
histórico efetivo
↓
placar
↓
saque
↓
rotação
↓
rally
↓
próxima ação
```

## Desfazer

```text
Ctrl+Z / Desfazer
→ desfaz evento registrado
```

Se esse evento alterou ponto, saque ou rotação, os efeitos derivados também são revertidos.

## Aceite
- corrigir atleta não quebra rally;
- corrigir qualidade recalcula consequências;
- desfazer ponto restaura placar/saque/rotação;
- reload mantém histórico efetivo.

---

# M4 — PLACAR MANUAL, ÚLTIMO RALLY E RECUPERAÇÃO

## Objetivo
Permitir recuperar a partida sem inventar ações técnicas.

## Placar independente

```text
Equipe A  [-] 18 [+]
Equipe B  [-] 17 [+]
```

Ajuste manual NÃO cria ataque, saque ou fundamento fictício.

Reutilizar evento existente se houver; senão criar conceito mínimo equivalente a:

```text
score_adjustment
teamId
delta
reason?
```

## Corrigir último rally

Ação rápida:

```text
Corrigir último rally
```

Permitir:
- trocar vencedor;
- corrigir último fundamento;
- trocar atleta;
- alterar # / =;
- corrigir trajetória.

Depois:

```text
Aplicar
↓
reprojetar
```

## Override da próxima ação
Disponível apenas como ferramenta de recuperação:

```text
Próxima ação:
Saque
Recepção
Ataque
Defesa
Bola de graça
```

Não deixar isso no fluxo normal.

## Estado de recuperação
Se houver inconsistência:

```text
Partida precisa de correção
```

Oferecer:
- corrigir último rally;
- ajustar placar;
- escolher próxima ação.

## Aceite
- corrigir 18–17 para 17–17 sem inventar scout;
- trocar vencedor de rally recompõe saque e rotação;
- sistema não trava em sequência inválida.

---

# M5 — SAQUE COMPLETO E ORIENTAÇÃO DA QUADRA

## Ace

```text
SAQUE
+
#
+
ENTER
↓
rally encerra
↓
ponto do sacador
↓
mesma equipe continua sacando
```

## Erro de saque

```text
SAQUE
+
=
+
ENTER
↓
rally encerra
↓
ponto adversário
↓
troca de saque
↓
rotação quando aplicável
```

## Saque normal

```text
SAQUE
sem # / =
ENTER
↓
RECEPÇÃO adversária
```

## Orientação física

Introduzir contexto explícito equivalente a:

```text
CourtOrientation {
  leftTeamId
  rightTeamId
}
```

Não confundir:
- lado físico;
- posse;
- time executor.

## Troca de lado

```text
Set 1
A esquerda / B direita

Set 2
B esquerda / A direita
```

## Coordenadas
Dados espaciais devem seguir uma convenção canônica estável.
A UI pode espelhar/inverter a quadra sem alterar o significado analítico.

## Aceite
- ace encerra rally corretamente;
- erro de saque encerra rally corretamente;
- troca de lado não corrompe mapas/heatmaps;
- origem/destino continuam semanticamente corretos.

---

# M6 — SEM ATLETA E SCOUT DE UMA EQUIPE

## Sem atleta
Disponível para qualquer equipe.

Não criar:
- jogador 0;
- atleta fictício;
- associação silenciosa ao sugerido.

## Cobertura da partida

```text
Ambas as equipes
Somente Equipe A
Somente Equipe B
```

Pode mudar durante o jogo.
Guardar cobertura por trecho/evento.

## Scout parcial
Quando uma equipe não é observada:
- não exigir todas as ações adversárias;
- permitir encerrar rally por resultado;
- não inferir defesa só porque ação não foi registrada;
- manter placar confiável.

## Analytics
- ações sem atleta entram no total da equipe;
- ficam fora de estatísticas individuais;
- mostrar “Sem atleta identificado”;
- indicar cobertura da amostra.

## Aceite
- ataque # sem atleta funciona;
- scout apenas A funciona;
- scout apenas B funciona;
- mudar cobertura no meio do set não altera passado.

---

# M7 — TROCAS RÁPIDAS NA ROTAÇÃO

Fluxo:

```text
Trocar
↓
atleta que sai
↓
reserva
↓
aplicar
```

Meta: até 3 interações.

Preservar:
- slot;
- posição;
- saque;
- levantador;
- histórico;
- regras de líbero existentes.

Não transformar clique normal de atleta em substituição.

Se uma troca invalidar atleta do draft:
- preservar trajetória e qualidade;
- pedir nova escolha de atleta;
- não reassociar silenciosamente.

---

# M8 — ANÁLISES PERSISTENTES

## Status

Concluída em 12/09/2026.

Entrega realizada:

- novo modelo versionado de configuração analítica por partida;
- persistência IndexedDB separada dos eventos e do cache analítico;
- salvamento, carregamento e exclusão de análises nomeadas na tela de análises;
- filtros, modo espacial, origem/destino e parâmetros do gráfico incluídos na configuração;
- backup JSON e restauração incluindo as configurações salvas;
- invalidação do cache analítico após registro, correção, ajuste de placar, troca, undo e refazer;
- migração do banco para a versão 7.

Validação local: typecheck aprovado e 32 testes focados aprovados.

Persistir por partida:
- filtros;
- modo espacial;
- origem/destino;
- configuração do gráfico;
- nome da análise.

Separar:

```text
eventos
≠
cache analítico
≠
configuração salva
```

Correções e undo/refazer invalidam resultados derivados.
Backup deve incluir configurações salvas.

---

# M9 — GRÁFICOS NO RELATÓRIO

## Status

Concluída em 12/09/2026.

Entrega realizada:

- seleção de gráficos para o relatório PDF;
- persistência separada das configurações analíticas da M8;
- suporte a tipo, título, filtros, parâmetros, ordem, amostra e cobertura;
- inclusão repetida do mesmo gráfico com filtros diferentes;
- reordenação e remoção na tela de análise;
- backup JSON e restauração das seleções;
- exportação PDF limitada exatamente aos gráficos selecionados;
- reutilização dos dados já calculados no `MatchReportModel`.

Validação local: typecheck aprovado e 34 testes focados aprovados.

Cada gráfico pode:

```text
Adicionar ao relatório
Remover
```

Persistir:
- tipo;
- filtros;
- parâmetros;
- ordem;
- título;
- amostra;
- cobertura.

Permitir mesmo gráfico com filtros diferentes.
Exportar exatamente o que foi selecionado.
Não duplicar cálculos no exportador; reutilizar analytics.

---

# M10 — VALIDAÇÃO INTEGRADA

## Status

Validação funcional realizada em 12/09/2026, mas o fechamento permanece pendente.

Validado:

- typecheck aprovado;
- testes atuais de gestual, espacial, replay, exportação e persistência aprovados;
- navegação principal com atalhos de nova partida, perfis e manual aprovada;
- arquivo de teste vazio de probabilidade substituído por teste executável;
- suíte focada da M9/M10: 34 testes aprovados;
- testes gestuais após o ajuste de seleção: 7 aprovados.

Pendência explícita:

- 6 cenários de `src/ui/app/AppFlow.test.tsx` ainda usam nomes e componentes da interface anterior (`VisualScoutForm`/`MiniCourt`), enquanto a interface atual usa `VolleyballVisualScout`/`SpatialCourtInputV2`.

M10 só deve ser marcada como encerrada depois de atualizar esses cenários e obter a suíte completa verde.

## Fluxo
- gesto + atleta + # + Enter = uma ação;
- Enter repetido não duplica;
- Esc cancela draft;
- undo restaura evento e efeitos derivados.

## Correção
- trocar atleta de evento anterior;
- trocar vencedor do último rally;
- corrigir # para continuidade;
- reload preserva correções.

## Placar
- +1 / -1 sem inventar scout;
- placar corrigido não quebra sequência.

## Saque
- ace;
- erro de saque;
- saque normal.

## Quadra
- A esquerda / B direita;
- troca de lado;
- mapas continuam corretos.

## Scout parcial
- sem atleta;
- somente A;
- somente B.

## Trocas
- reserva entra no slot correto;
- saque/levantador permanecem coerentes.

## Persistência
- fechar e reabrir;
- backup/restaurar;
- análises e relatório permanecem.

## Gates finais

Somente no fechamento:

```bash
npm run typecheck
npm test
npm run build
```

Lint/E2E apenas se as instruções locais exigirem ou o ambiente estiver funcional.

---

# VALIDAÇÃO GENTIL

Aplicar em toda a 0.4:

```text
impossível → bloquear
improvável → avisar
válido → registrar
```

Não bloquear situações incomuns que ainda são possíveis no voleibol.

---

# FORA DO ESCOPO

- mobile nativo;
- APK;
- Capacitor;
- React Native;
- cloud;
- multiusuário;
- IA para interpretar gesto;
- novo banco;
- nova arquitetura de analytics;
- reescrita geral do RallyContextResolver;
- nova quadra paralela.

---

# REGRA DE EXECUÇÃO PARA LUNA / CODEX

Ao receber:

```text
Execute a próxima macro
```

fazer:

1. ler o estado deste documento;
2. abrir somente a macro atual;
3. localizar arquivos diretamente necessários;
4. reaproveitar o que já existe;
5. implementar apenas essa macro;
6. rodar testes focados + typecheck;
7. atualizar status;
8. parar.

Não repetir reconhecimento já feito.
Não fazer auditoria geral.
Não avançar para a macro seguinte.

---

# PROMPT PARA CONTINUAR AGORA

```text
Leia SCOUT_TRAINER_0.4_PLANO_CONSOLIDADO.md.

A primeira parte do plano anterior já foi implementada localmente.
Não refaça M0/M1 e não faça reset para o GitHub.

Confirme rapidamente o estado local e execute somente M3 — Histórico corrigível e reprojeção segura.

Preserve o layout já melhorado, a quadra gestual atual, o pipeline canônico, rotação, histórico e os outros modos.

Ao terminar:
- rode testes focados e typecheck;
- atualize o status;
- informe arquivos alterados;
- pare antes de M3.
```
