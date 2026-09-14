# SCOUT TRAINER 0.4 — CORREÇÃO PRIORITÁRIA DO MODO GESTUAL
## Reutilizar a quadra existente + corrigir a sequência do rally
### Documento curto para GPT-5.6 Luna

> EXECUTAR ESTA CORREÇÃO ANTES DE CONTINUAR O PLANO 0.4.
>
> Não fazer auditoria geral. Não redesenhar a quadra do zero. Não implementar mobile.

# 1. PROBLEMA

A tentativa atual do modo Gestual criou uma quadra visual nova/pior e está seguindo a sequência canônica bruta do rally, o que produz ações inadequadas para o fluxo gestual.

O modo gestual deve REUTILIZAR o que já funciona no Scout Trainer.

# 2. FONTE VISUAL OBRIGATÓRIA

Usar como referência/base visual:

```text
src/ui/screens/scout/SpatialCourtInputV2.tsx
src/ui/screens/scout/SpatialCourtInputV2.css
src/ui/screens/scout/VolleyballVisualScout.css
```

A nova tela NÃO deve inventar outra estética de quadra.

Preservar da SpatialCourtInputV2:

```text
proporção 2:1
rede central
linhas de ataque
marcadores pequenos
linha fina origem → destino
aparência integrada ao Scout Trainer
dimensão controlada dentro do workspace
```

Não usar a quadra gigante isolada criada na tentativa gestual.

IMPORTANTE:
`SpatialCourtInputV2` antiga usa dois cliques e não deve ser alterada para quebrar o modo existente.

Se necessário, criar um wrapper gestual que REUTILIZE a mesma apresentação/CSS, sem duplicar uma nova identidade visual.

# 3. FONTE DE INTERAÇÃO OBRIGATÓRIA

Já existe lógica de arrastar no projeto:

```text
src/ui/screens/scout/TacticalCourt.tsx
src/ui/screens/scout/courtGeometry.ts
```

Reutilizar o padrão:

```text
pointerdown
↓
guardar origem
↓
setPointerCapture
↓
pointermove mostra trajetória
↓
pointerup fixa destino
↓
releasePointerCapture
↓
UMA trajetória
```

Não voltar ao padrão:

```text
clique origem
+
clique destino
+
confirmação duplicada
```

Para coordenadas livres, usar `normalizedCourtPoint` como base de pixel → coordenada normalizada.

Não copiar a lógica de zonas táticas se ela não for necessária.

# 4. COMPONENTE DESEJADO

O componente novo pode se chamar:

```text
GestureCourtInput
```

Mas ele NÃO deve ser "uma nova quadra".

Ele é:

```text
VISUAL da SpatialCourtInputV2
+
GESTO do TacticalCourt
+
COORDENADAS normalizadas existentes
```

Arquitetura:

```text
SpatialCourt visual existente
        +
pointer drag existente
        ↓
GestureCourtInput
        ↓
{ origin, destination }
```

A quadra não decide fundamento, atleta ou resultado.

# 5. CORRIGIR A SEQUÊNCIA DO MODO GESTUAL

NÃO usar diretamente a sequência visual de `RallyContextResolver` como fluxo da interface gestual.

O domínio canônico possui, por compatibilidade:

```text
serve
→ reception
→ set
→ attack
→ block
→ dig
→ set
→ attack
```

Esse fluxo deve continuar existindo no domínio.

NÃO ALTERAR GLOBALMENTE `RallyContextResolver`.

No modo gestual, criar uma política pequena, por exemplo:

```text
GestureExpectedActionResolver
```

Ela traduz a ação canônica esperada para a ação que o scoutman realmente precisa registrar.

Regra:

```text
CANÔNICO        GESTUAL

serve        →  serve
reception    →  reception
set          →  attack
attack       →  attack
block        →  dig
dig          →  dig
free_ball    →  free_ball
```

Na prática, a sequência rápida fica:

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

O levantamento fica IMPLÍCITO.

O bloqueio NÃO é uma etapa obrigatória entre ataque e defesa.

# 6. BLOQUEIO

Manter `block` no domínio para compatibilidade.

No modo gestual:

```text
ataque
↓
defesa adversária
```

é o fluxo normal.

Casos de bloqueio devem entrar como contexto/resultado quando necessário.

Exemplos:

```text
ataque fora + # do atacante
→ block-out
→ blockTouch = true
```

```text
bloqueio ponto identificado
→ registrar block # explicitamente
```

Não obrigar:

```text
ATAQUE
→ escolher bloqueador
→ BLOQUEIO
→ DEFESA
```

em todo rally.

# 7. SAQUE E ROTAÇÃO

Reutilizar a política que já existe em:

```text
src/ui/screens/scout/visualSuggestion.ts
```

Ela já faz duas coisas importantes:

```text
set esperado → attack
```

e:

```text
serve → atleta da P1 sugerido automaticamente
```

Não criar outra lógica independente para descobrir o sacador.

# 8. ORDEM DE CORREÇÃO

Executar somente:

1. identificar os arquivos locais da tentativa gestual;
2. substituir a quadra inventada pela apresentação baseada em `SpatialCourtInputV2`;
3. aplicar o padrão de drag/pointer de `TacticalCourt`;
4. criar/aplicar `GestureExpectedActionResolver`;
5. remover `set` e `block` como etapas obrigatórias da UI gestual;
6. garantir P1 automático no saque;
7. testar a sequência curta abaixo;
8. parar.

# 9. TESTE OBRIGATÓRIO CURTO

Executar apenas:

```text
início do rally
↓
SAQUE da P1
↓
RECEPÇÃO do adversário
↓
ATAQUE do adversário
↓
DEFESA
↓
ATAQUE
```

Confirmar:

```text
não apareceu levantamento
não apareceu bloqueio obrigatório
time da ação alternou corretamente
atletas aparecem por número/nome, nunca UUID
cada gesto gerou exatamente uma ação
quadra é a mesma linguagem visual da 0.3
```

Depois testar:

```text
ATAQUE → # → rally encerra
ATAQUE fora → = → rally encerra
ATAQUE fora → # → block-out
```

# 10. VERIFICAÇÃO

Rodar somente:

```bash
npm run typecheck
```

e os testes diretos dos módulos alterados.

NÃO rodar auditoria geral.
NÃO rodar E2E global.
NÃO rodar build completo nesta correção.

# 11. PROMPT PARA EXECUÇÃO

```text
Leia SCOUT_TRAINER_0.4_CORRECAO_QUADRA_SEQUENCIA.md.

Execute somente esta correção.

IMPORTANTE:
- não crie outra quadra;
- reutilize a aparência de SpatialCourtInputV2;
- reutilize o padrão de drag/pointer de TacticalCourt;
- não altere RallyContextResolver globalmente;
- crie apenas uma política gestual para esconder set e block do fluxo rápido;
- preserve os outros modos;
- não implemente mobile;
- rode somente testes diretos e typecheck;
- pare ao terminar.
```
