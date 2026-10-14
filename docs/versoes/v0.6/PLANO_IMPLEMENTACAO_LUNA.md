# Plano mestre 0.6 para o Luna

## Objetivo

Entregar **Futsal como terceira modalidade**, usando a experiência de scout por posse do futebol como base técnica, com **quadra específica de futsal** e relógio de tempo efetivo alternado pela tecla **T**. A 0.6 também corrige o fluxo de substituições que hoje não está disponível no registro principal de futebol e verifica o fluxo do vôlei. O futsal terá trocas volantes próprias; não herdará a rotação do vôlei nem o campo e as métricas do futebol.

## Situação encontrada no repositório

- `MatchSport.ts` contém apenas `volleyball | football`; `App.tsx` só encaminha essas modalidades às telas. A quadra em `FootballCourtSurface.tsx` desenha futebol de campo.
- `FootballMinimalScoutScreen.tsx` expõe as ações rápidas de futebol, mas **não contém `substitution` em `quickActions`** nem seleciona `relatedPlayerId`. `FootballActionPanel.tsx` lista a ação, porém não é montado no registro atual. O serviço `registerFootballEvent` aceita `relatedPlayerId`, e `FootballRecorder.ts` consegue criar um evento de substituição. A correção precisa fechar o caminho completo de UI → serviço → projeção → recarga.
- `ScoutTrainerService.substitute()` e `CourtLineup.tsx` servem à escalação/rotação do vôlei. Há testes de integração, mas a queixa de uso exige reprodução em tela e regressão. Esse método **não** deve ser reaproveitado para trocas volantes do futsal.
- `FootballRecorder.ts` soma 45 minutos no segundo período; `ScoutTrainerService.observeFootballControl()` também. No futsal a contagem acumulada começa após os 20 minutos do primeiro período.
- `FootballModels.ts` usa `reference/football-models/xg.json`, com campo de 105 × 68 m e treino em partidas masculinas de futebol de campo de 2022. Essa calibração não vale para futsal. Consulte [a decisão de xG](REFERENCIAS_E_DECISOES.md#xg-no-futsal).
- O roteiro 0.5.0 de futebol por posse ainda tem piloto humano e análises pendentes. Este plano não afirma que foram concluídos.

## Decisões de produto

1. Futsal é valor explícito de `MatchSport`; nunca classificar automaticamente backup antigo como futsal.
2. A quadra de futsal tem desenho próprio: área de 6 m, marcas de 6/10 m, círculo central e balizas. Captura de posição continua normalizada em `[0,1]²`; metros somente quando a dimensão real da quadra for conhecida.
3. Relógio padrão de **2 × 20:00 de bola em jogo**, mostrado de forma regressiva. **T** e botão visível fazem a mesma transição de iniciar/pausar. Parada da bola e pausa da coleta são estados diferentes do relógio; o operador acompanha o cronometrista oficial.
4. Coleta mínima: controle por equipe, disputa/desconhecido, posição observada, parada/reinício, chute/resultado, gol, falta acumulada. Etiquetas táticas e atleta são opcionais.
5. Substituições de futebol e de futsal exigem equipe, quem sai e quem entra, com IDs da partida, horário e correção/desfazer. No futsal a troca pode ocorrer com bola em jogo e não requer pausa do relógio. Quando a escalação não foi observada, permitir registrar a troca com certeza parcial, sem inventar cinco titulares.
6. A 0.6 **não exibirá xG para futsal**. Exibirá finalizações, gols e conversão com denominador/cobertura. Um modelo de xG futuro precisa de dados e validação específicos de futsal; a métrica existe como conceito, mas o modelo local é de futebol de campo.
7. Backup deve distinguir futsal e preservar todos os eventos. Exportação StatsBomb existente permanece exclusiva do futebol até haver contrato de intercâmbio próprio para futsal.

## Fluxo de execução

`M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8`. **M0 foi concluída como contrato documental** em [`CONTRATOS_M0.md`](CONTRATOS_M0.md); a próxima etapa é M1. A correção de substituições existentes vem antes da modalidade nova para que o Luna conserte o fluxo quebrado sem confundi-lo com a implementação das trocas volantes.

| Etapa | Resultado verificável |
|---|---|
| [M0](etapas/M0_CONTRATOS_E_AUDITORIA.md) | Contratos, casos calculáveis e fronteiras entre modalidades |
| [M1](etapas/M1_CORRIGIR_SUBSTITUICOES.md) | Substituição de futebol utilizável; vôlei verificado e corrigido se a falha for reproduzida |
| [M2](etapas/M2_MODALIDADE_E_QUADRA.md) | Criar/abrir futsal com quadra própria em desktop e celular |
| [M3](etapas/M3_RELOGIO_TECLA_T.md) | T opera relógio persistido, com recuperação e virada de período |
| [M4](etapas/M4_SCOUT_ESSENCIAL.md) | Partida completa registrável sem tática ou atletas obrigatórios |
| [M5](etapas/M5_SUBSTITUICOES_FUTSAL.md) | Trocas volantes e composição observada coerentes |
| [M6](etapas/M6_TATICA_E_REVISAO.md) | Tática opcional e revisão sem travar o jogo |
| [M7](etapas/M7_ANALISES_E_XG.md) | Análises com cobertura, sem xG de futebol no futsal |
| [M8](etapas/M8_VALIDACAO_E_ENTREGA.md) | Regressão, piloto e pacote 0.6 documentados |

## Regras comuns de execução

- Ler ` AGENTS.md` (há um espaço inicial no nome), este plano, [`REFERENCIAS_E_DECISOES.md`](REFERENCIAS_E_DECISOES.md) e o MD da etapa pedida. Conferir `git status` antes de editar; preservar alterações existentes no checkout.
- Reutilizar serviços e componentes que sirvam ao novo esporte, sem transformar evento de futsal em `scout_trainer.modality='football'` ou usar coordenadas 120 × 80 como metros de futsal. Não reescrever o motor do vôlei.
- Não inferir passe, condução, formação, atleta, duração de pressão ou trajetória contínua de dois marcos esparsos. Separar não observado, parcial e zero.
- Não adicionar dependência, IA, tracking, publicação, instalador ou alteração de versão de `package.json` por conveniência. O bump para 0.6 pertence à entrega M8 quando o usuário pedir a implementação da versão.
- Validar com testes proporcionais e inspeção visual nas etapas com UI. Teste automatizado não substitui piloto humano.

## Prompt para a próxima etapa do Luna

```text
Leia ` AGENTS.md` (nome com espaço inicial),
docs/versoes/v0.6/README.md,
docs/versoes/v0.6/PLANO_IMPLEMENTACAO_LUNA.md,
docs/versoes/v0.6/REFERENCIAS_E_DECISOES.md e
docs/versoes/v0.6/CONTRATOS_M0.md e
docs/versoes/v0.6/etapas/M1_CORRIGIR_SUBSTITUICOES.md.
Execute somente M1. Preserve alterações preexistentes e partidas antigas.
Feche o fluxo de substituição do futebol na tela real em uso e reproduza
o fluxo de vôlei antes de qualquer correção nele. Informe decisões,
arquivos, testes executados e pendências. Não inicie M2 automaticamente.
```
