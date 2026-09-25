> **Versão/escopo:** 0.4.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# SCOUT TRAINER 0.4 — REFINO DO MODO GESTUAL
## Fluxo, estados, quadra compartilhada e layout desktop
### Plano enxuto para GPT-5.6 Luna

> Objetivo: refinar a implementação gestual LOCAL atual até ela ficar rápida, clara e confiável.
> Mobile, APK e redesign geral do Scout Trainer ficam fora desta rodada.

# ESTADO
- Base: implementação gestual local atual
- GitHub/main: referência da 0.3 estável
- Macro atual: concluída
- Status: CONCLUÍDA COM LIMITAÇÃO DE AMBIENTE
- Última macro concluída: 8 — teste de partida e fechamento
- Fechamento Macro 8: `ataque fora + =` persiste `terminalCause=attack_out` e `blockTouch=false`; `ataque fora + #` preserva o ponto canônico e persiste `terminalCause=block_out` e `blockTouch=true`. Typecheck aprovado. A execução de testes e o build foram bloqueados antes de carregar o projeto porque o Node 18.19.1 do ambiente não fornece `node:util.styleText`, exigido pelo Rolldown instalado. A validação visual manual em 1366x768 permanece dependente de ambiente gráfico.
- Diagnóstico Macro 0: o Gestual recria a quadra em JSX e CSS próprios; não importa nem compartilha a superfície da SpatialCourtInputV2. Compartilha apenas a geometria normalizada do domínio e usa Pointer Capture. A ação esperada vem de `workspace.tacticalRally.expectedNextAction`, traduzida por `GestureExpectedActionResolver`. Macro 1 necessária.
- Uma macro por sessão
- Não fazer reset/checkout para o GitHub
- Não apagar o trabalho gestual já feito
- Preservar Digitado, Visual e Híbrido
- Preservar pipeline canônico, IndexedDB, histórico, rotação e analytics

# RESULTADO VISUAL DESEJADO

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Partidas       Equipe A x Equipe B                       Registro      │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────────────────────┐  ┌──────────────────┐ │
│ │ AGORA        │  │                              │  │     18  x  17    │ │
│ │ ATAQUE       │  │                              │  │      SET 1       │ │
│ │ Equipe A     │  │            QUADRA            │  ├──────────────────┤ │
│ │              │  │                              │  │ Rotação Equipe A │ │
│ │ Atleta       │  │                              │  │ [4][3][2]        │ │
│ │ [#4] [#3]    │  └──────────────────────────────┘  │ [5][6][1]        │ │
│ │ [#2] [outros]│                                    ├──────────────────┤ │
│ │              │                                    │ Rotação Equipe B │ │
│ │ [ # ] [ = ]  │                                    │ [2][3][4]        │ │
│ │ Bola de graça│                                    │ [1][6][5]        │ │
│ │ [ ⋯ ]        │                                    └──────────────────┘ │
│ │ ↶ Desfazer   │                                                         │
│ │ ENTER registra                                                         │
│ └──────────────┘                                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

Prioridade visual: ação atual → quadra → atleta → resultado → placar → rotações → ações secundárias.

# DECISÕES FIXAS

## ENTER registra a ação

```text
desenhar trajetória
↓
escolher atleta, se necessário
↓
marcar # ou =, se necessário
↓
ENTER
↓
registrar UM evento
↓
limpar draft
↓
mostrar próxima ação
```

Sem #/= + ENTER = continuidade/neutro quando permitido.

Se faltar informação, ENTER não registra e mostra o que falta, por exemplo: `Escolha o atleta`.

- ignorar key-repeat/double-submit;
- Enter durante `committing` não faz nada;
- ESC limpa somente o draft atual;
- Desfazer atua no evento já registrado.

# ESTADOS VISUAIS

Nunca mostrar `dig`, `attack`, `waiting_player`, UUID ou nomes internos.

```text
AGORA
DEFESA — EQUIPE B
Trace a trajetória da bola
```

Depois do gesto:

```text
DEFESA — EQUIPE B
Trajetória pronta
Escolha quem defendeu
```

Depois do atleta:

```text
DEFESA — EQUIPE B
#12 Jogador 12
Pronto para registrar
ENTER
```

Após sucesso, feedback curto: `✓ Defesa registrada`.

# SEQUÊNCIA GESTUAL

O domínio completo permanece intacto. A UI gestual apresenta:

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
DEFESA
↓
...
```

`set` continua no domínio, mas vira `attack` na política gestual.
`block` continua no domínio, mas vira `dig` no fluxo normal da UI gestual.
Bloqueio só aparece como evento/contexto quando realmente necessário.

# QUADRA — REGRA PRINCIPAL

O Gestual NÃO deve ter uma cópia visual parecida com a quadra do Visual. Ele deve usar a MESMA superfície visual.

Se necessário, extrair um componente apresentacional compartilhado:

```text
SpatialCourtInputV2 ─┐
                     ├→ SpatialCourtSurface
GestureCourtInput ───┘
```

`SpatialCourtSurface` desenha apenas:
- fundo/quadra;
- rede;
- linhas de ataque;
- marcadores;
- linha de trajetória;
- outZone quando habilitada.

`SpatialCourtInputV2` mantém sua interação antiga.
`GestureCourtInput` usa arrasto/pointer.

Não copiar CSS para criar outra identidade de quadra.

# INTERAÇÃO DA QUADRA

Usar o padrão já existente de Pointer Events:

```text
pointerdown
↓
setPointerCapture
↓
pointermove mostra linha ao vivo
↓
pointerup fixa destino
↓
releasePointerCapture
↓
draft pronto
```

Regras de feeling:
- origem aparece imediatamente;
- linha acompanha o cursor sem atraso perceptível;
- destino coincide com o local em que soltou;
- sem seleção de texto durante drag;
- uma interação = um draft;
- nova trajetória substitui somente draft não registrado;
- após ENTER com sucesso, limpar a trajetória;
- `pointercancel` e `lostpointercapture` tratados;
- mapper normalizado independente do tamanho da tela.

# MACRO 0 — VERIFICAÇÃO LOCAL CIRÚRGICA

Objetivo: confirmar como a implementação gestual LOCAL está usando a quadra e o estado.

Ler somente:
- arquivos `Gesture*` atuais;
- `SpatialCourtInputV2.tsx`;
- `SpatialCourtInputV2.css`;
- `TacticalCourt.tsx`;
- `courtGeometry.ts`;
- ponto que monta o modo Gestual.

Responder tecnicamente:
1. Gesture importa SpatialCourtInputV2?
2. copia o CSS?
3. recria a quadra em JSX?
4. compartilha apenas classes?
5. usa o mesmo mapper geométrico?
6. usa pointer capture?
7. de onde vem expected action?

Se recria a quadra: NÃO polir a cópia; preparar superfície compartilhada.
Se já compartilha: preservar e corrigir interação/layout.

Não fazer alteração grande nesta macro. Atualizar ESTADO e parar.

# MACRO 1 — SUPERFÍCIE DE QUADRA COMPARTILHADA

Executar somente se a Macro 0 confirmar duplicação.

Extrair somente a apresentação reutilizável. Não mover regra de scout.

Aceitação:
- Visual continua igual;
- Gestual usa a mesma superfície de verdade;
- nenhum CSS paralelo imitando a quadra;
- interação antiga do Visual preservada.

Verificação: teste de render direto + `npm run typecheck`.

# MACRO 2 — ESTADO E SEQUÊNCIA CORRETOS

Criar/refinar módulos pequenos como:

```text
GestureExpectedActionResolver
GestureDraftState
```

Estado mínimo:

```text
awaiting_gesture
awaiting_player
ready_to_commit
committing
error
```

Teste obrigatório de times e ações:

```text
A saca
B recebe
B ataca
A defende
A ataca
B defende
```

Regras:
- `set` canônico → `attack` gestual;
- `block` canônico → `dig` gestual;
- saque usa P1 automaticamente;
- não inventar atleta nas demais ações;
- free_ball transfere posse corretamente;
- rally terminal limpa ação esperada.

Verificação: testes puros + `npm run typecheck`.

# MACRO 3 — ENTER COMO COMMIT ÚNICO

Criar uma única função de aplicação:

```text
commitCurrentGesture()
```

Enter chama essa função.

Aceitação:
- Enter sem gesto não registra;
- Enter sem atleta obrigatório mostra pendência;
- Enter não duplica;
- 10 ações com Enter = 10 eventos;
- após sucesso o draft é limpo e próxima ação aparece.

Verificação: keyboard handler + double-submit + `npm run typecheck`.

# MACRO 4 — LAYOUT DESKTOP EM 3 COLUNAS

```text
ESQUERDA             CENTRO            DIREITA
estado/controles     quadra            placar
atleta                                 rotações
# /=                                   contexto
quick actions
undo/Enter
```

Esquerda: ~190–230 px.
Centro/quadra: ~500–650 px conforme viewport.
Direita: ~280–340 px.

Direita:
- placar no topo;
- set e saque/recepção;
- rotação A compacta;
- rotação B compacta.

Não manter as rotações gigantes em largura total embaixo.

Alvo desta fase: 1366x768, 1440x900 e 1920x1080.
Sem layout mobile.

Aceitação em 1366x768:
- quadra inteira visível;
- controles inteiros visíveis;
- placar/rotações visíveis;
- nenhuma rolagem necessária durante o rally.

Verificação: render básico + `npm run typecheck`.

# MACRO 5 — ROTAÇÕES E PICKER COMPACTOS

Rotação:

```text
P4   P3   P2
#4   #3   #2
P5   P6   P1
#5   #6   #1
```

Mostrar número e marcadores discretos de levantador/sacador. Nome completo só quando necessário.

Picker esquerdo:
- saque: P1 automático;
- recepção: P5/P6/P1 primeiro;
- ataque: P4/P3/P2 primeiro;
- defesa: sem restrição;
- todos os atletas em quadra continuam disponíveis.

Nenhum UUID.

Verificação: candidate resolver + `npm run typecheck`.

# MACRO 6 — POLIR O TOUCH/FEEL DA QUADRA

Ajustar:
- preview em tempo real;
- cursor coerente;
- `user-select: none` durante gesto;
- markers discretos;
- destino mais destacado;
- pequeno threshold para drag acidental;
- cancelamento robusto;
- sem animações pesadas.

Teste obrigatório: 20 gestos consecutivos = exatamente 20 drafts.

Verificação: geometria + pointer lifecycle + `npm run typecheck`.

# MACRO 7 — AÇÕES RÁPIDAS E LINGUAGEM HUMANA

Na esquerda:

```text
[#] [=]
[Bola de graça]
[⋯]
[↶ Desfazer]
ENTER registra
```

`⋯` fechado por padrão: toque na rede, invasão, dois toques, erro de rotação, outro.

Substituir `Esperando: dig` por `DEFESA — EQUIPE A`, etc.

Verificação: render + `npm run typecheck`.

# MACRO 8 — TESTE DE PARTIDA E FECHAMENTO

Testar:
1. saque A / P1 automático;
2. recepção B;
3. ataque B;
4. defesa A;
5. ataque A #;
6. novo rally;
7. ataque fora =;
8. novo rally;
9. ataque fora # → block-out;
10. ataque → defesa → bola de graça;
11. desfazer;
12. refazer corretamente;
13. reload;
14. continuar partida.

Confirmar:
- cada Enter cria um evento;
- sequência/time corretos;
- placar/rotação corretos;
- nenhum UUID;
- sem set/bloqueio obrigatório;
- mesma superfície de quadra do Visual;
- gesto alinhado ao cursor;
- sem scroll para scout em 1366x768.

Somente no fechamento:

```bash
npm run typecheck
npm test
npm run build
```

# FORA DO ESCOPO
- mobile;
- APK/Capacitor/React Native;
- novo banco/cloud;
- novo analytics/heatmap;
- redesign dos outros modos;
- reescrever RallyContextResolver globalmente;
- novo sistema de rotação;
- outra quadra.

# REGRA DE ECONOMIA PARA O LUNA
1. Ler ESTADO.
2. Executar somente a macro atual.
3. Abrir apenas arquivos diretamente necessários.
4. Não auditar o repo inteiro.
5. Não antecipar próxima macro.
6. Rodar somente testes diretos + typecheck.
7. Atualizar ESTADO.
8. PARAR.

# PROMPT CURTO PARA O LUNA

```text
Leia SCOUT_TRAINER_0.4_PLANO_REFINO_GESTUAL_DESKTOP.md.

Trabalhe SOBRE a implementação gestual local atual.
Não faça reset/checkout para o GitHub.

Execute somente a MACRO ATUAL.

Na Macro 0, confirme primeiro se o Gestual está realmente reutilizando a mesma quadra do Visual ou apenas copiando sua aparência.

Se houver duplicação, prefira uma superfície visual compartilhada usada por SpatialCourtInputV2 e GestureCourtInput, mantendo as interações separadas.

Não implemente mobile.
Não refatore os outros modos.
Não faça auditoria geral.
Rode somente os testes da macro + typecheck.
Atualize o ESTADO e pare.
```
