# Roteiro de implementação — correção da rotação implícita no modo gestual

## Objetivo

Corrigir o modo gestual para que a rotação atual continue sendo derivada do contexto da partida,
sem pedir ao operador que escolha manualmente posições ou redefina a formação a cada rally.

Regras fixas:

- a rotação permanece implícita e vem da escalação atual da partida;
- a rotação e a posição efetivas são persistidas em cada registro relevante como snapshot histórico;
- o sacador é sempre o atleta que ocupa P1 na equipe que está sacando;
- atletas do fundo são os atletas atualmente em P1, P5 e P6;
- atletas da frente são os atletas atualmente em P2, P3 e P4;
- sugestões apenas priorizam atletas e nunca bloqueiam uma ação válida;
- substituições e rotação devem atualizar as sugestões automaticamente;
- não criar um segundo estado de rotação dentro da UI gestual.

“Implícita” significa que o operador não precisa informar a rotação manualmente. Não significa
descartar essa informação: o evento canônico deve registrar a rotação e a posição do atleta no
momento do contato para permitir análises estatísticas posteriores.

---

## Parte 1 — Fonte única da rotação e sugestões posicionais

### Objetivo

Garantir que todas as sugestões gestuais sejam calculadas exclusivamente a partir de
`workspace.currentLineups` e `workspace.state.servingTeamId`.

### Implementação

1. Revisar o resolver de sugestões para receber a escalação atual da equipe.
2. Resolver o sacador pela relação:

   ```text
   servingTeamId → lineup da equipe → positions[1] → slot → playerId
   ```

3. Resolver atletas do fundo por `[1, 5, 6]`.
4. Resolver atletas da frente por `[2, 3, 4]`.
5. Aplicar prioridades:

   ```text
   saque: P1 automático
   recepção: P5, P6, P1
   ataque: P4, P3, P2
   bloqueio: P4, P3, P2
   ```

6. Manter todos os demais atletas selecionáveis.
7. Recalcular sugestões quando houver:

   - mudança de set;
   - rotação após ponto;
   - substituição;
   - alteração da equipe sacadora.

### Não fazer

- Não pedir posição ao operador.
- Não escolher o sacador pela ordem do cadastro ou pelo número da camisa.
- Não classificar atleta como fundo pela função tática.
- Não criar estado local concorrente de rotação.

### Aceitação

- P1 da equipe sacadora aparece como sacador automático.
- Em qualquer rotação, fundo significa exatamente P1/P5/P6.
- Ataque e bloqueio priorizam exatamente P4/P3/P2.
- Após rotação ou substituição, as sugestões mudam sem recarregar a partida.

---

## Parte 2 — Fluxo gestual e registro canônico

### Objetivo

Usar as sugestões posicionais sem duplicar eventos e sem transformar a rotação em entrada manual.

### Implementação

1. Manter a sequência gestual guiada pelo contexto:

   ```text
   saque → recepção → ataque → defesa/continuidade
   ```

2. Para saque, usar automaticamente o playerId de P1 da equipe sacadora.
3. Para recepção, mostrar primeiro P5/P6/P1 da equipe receptora.
4. Para ataque, mostrar primeiro P4/P3/P2 da equipe atacante.
5. Permitir seleção de qualquer atleta da escalação, inclusive P1/P5/P6 no ataque.
6. Manter o ataque em estado pendente após o gesto espacial.
7. Registrar um único evento somente quando a identificação mínima estiver completa.
8. Associar a trajetória ao mesmo evento que recebe `#`, `=`, `!` ou `+`.
9. Não registrar um evento neutral provisório e outro evento terminal para o mesmo ataque.
10. Manter o levantamento implícito.
11. Persistir no evento o contexto efetivo do contato:

   ```text
   teamId
   playerId
   lineupContext.rotationPosition
   lineupContext.slotId
   lineupContext.tacticalRole
   setterPosition, quando disponível
   setNumber
   ```

   Esse contexto é um snapshot do momento do registro e não deve ser recalculado com a rotação
   atual ao consultar uma partida antiga.

### Casos semânticos

```text
ataque dentro + #       → attack / point
ataque fora + =         → attack / error ou attack_out
ataque fora + #         → block_out somente com confirmação do resultado atacante
ataque + defesa         → ataque continua neutro
ataque + bola de graça  → correção tardia do ataque para +
```

### Aceitação

- Um gesto produz no máximo um evento canônico.
- O playerId registrado corresponde ao atleta escolhido na escalação atual.
- O evento contém o snapshot de rotação e posição do atleta no momento do contato.
- O reload preserva esse snapshot mesmo após novos pontos, rotações ou substituições.
- Nenhum picker de posição ou rotação aparece durante o rally normal.
- O modo digitado e o modo visual legado permanecem inalterados.

---

## Parte 3 — Correção tardia, persistência e regressão

### Objetivo

Garantir que a rotação implícita continue correta após o rally avançar e que correções não criem
eventos duplicados nem estatísticas incompatíveis.

### Implementação

1. Conectar “Bola de graça” ao mecanismo existente de correção histórica.
2. Qualificar o ataque anterior como `+` somente quando a ação posterior confirmar vantagem clara.
3. Preservar o evento original e emitir a correção auditável existente.
4. Propagar a escalação/posição registrada no evento sem congelar uma rotação futura.
5. Garantir que replay e reload reconstruam as sugestões pela escalação efetiva daquele momento.
6. Garantir que `lineupContext` permaneça como snapshot e não seja sobrescrito pela rotação
   posterior.
7. Evitar duplicação de ponto quando saque e recepção descrevem o mesmo rally terminal.
8. Adicionar testes de regressão para:

   - saque em P1 após uma rotação;
   - saque após substituição em P1;
   - recepção por P5/P6/P1;
   - ataque por P4/P3/P2;
   - ataque de fundo permitido;
   - rotação após ponto;
   - correção tardia para `+`;
   - reload mantendo a posição correta;
   - análise estatística agrupando eventos pela rotação persistida.

### Verificação final

Executar, quando o ambiente estiver disponível:

```text
npm run typecheck
npm test
npm run build
npm run test:e2e
```

### Critério de conclusão

O modo gestual deve permitir registrar um rally rapidamente usando somente gesto, atleta quando
necessário e resultado mínimo, enquanto a rotação permanece sempre implícita e coerente com a
escalação atual da partida.
