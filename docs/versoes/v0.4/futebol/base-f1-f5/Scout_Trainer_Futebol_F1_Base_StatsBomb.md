> **Versão/escopo:** Base do app 0.4.0; pacote Futebol 0.1 (numeração própria do módulo).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../../COMECE_AQUI.md).

# F1 — Base StatsBomb, partida e campo compartilhado

**Leia primeiro:** `AGENTS.md`, `Scout_Trainer_Futebol_Plano_0_1_Luna.md`, `ESTADO.md` se existir, componentes reais do checkout. **Executar apenas F1.** O projeto deve seguir funcional para vôlei e para criar/retomar uma partida de futebol.

## O que entregar

1. Criar `sport: football` no fluxo real de nova partida e retomada, com duas equipes, elenco opcional, configuração local, períodos 1 e 2 e relógio corrido/passivo. Salvar marcação do começo/pausa/intervalo/ajuste; não reescrever tempos já gravados quando corrigir relógio. Seguir o armazenamento, backup e versionamento existentes; partida de vôlei antiga sem `sport` deve ser interpretada apenas pelo leitor legado, sem alteração do arquivo original.
2. Localizar a quadra gestual **já funcional** do vôlei e documentar nomes/caminhos reais. Reaproveitar mecanismos de Pointer Events, transformação de pixels para posição normalizada, arrasto, toque, teclado se presente, feedback, refazer e responsividade. Extrair só a parte realmente comum; adicionar geometria/SVG do futebol e adaptador espacial. Preservar a quadra de vôlei e a identidade visual existente. O campo de futebol deve ter linhas central, área, pequena área, círculo, arcos e gols proporcionais; sem grade de zonas como piso padrão.
3. Para futebol, salvar coordenadas canônicas no esquema StatsBomb: `location:[x,y]` com limites 0–120 e 0–80. O gesto pode continuar normalizado internamente. A conversão deve ser reversível e independente da largura renderizada. Guardar por período qual lado físico cada equipe defende/ataca quando conhecido; mudar o lado mostrado não altera coordenadas de eventos gravados. Equipe do evento sempre ataca em direção a `x=120` no evento StatsBomb; o renderer resolve espelhamento para uma vista física. Se lado físico desconhecido, não inventar.
4. Introduzir tipos/ID e contrato de armazenamento para o envelope de eventos, **sem implementar ainda os botões de evento**: `id` UUID, `index` inteiro global, `period`, `timestamp` do período, `minute` e `second` do jogo, `type:{id,name}`, `team`, `player?`, `possession`, `possession_team`, `play_pattern?`, `location?`, bloco do tipo, `scout_trainer:{schema_version,...}`. O 2º tempo tem `timestamp` iniciando em `00:00:00.000`, mas `minute` inicia em 45 como no arquivo oficial examinado; não usar `index` por tempo ou por posse. IDs numéricos locais de equipes/jogadores são estáveis nesta partida e não colidem com IDs da equipe adversária. IDs internos de partidas e nomes próprios não fingem ser IDs publicados pela StatsBomb.
5. Adicionar testes pequenos para transformação espacial/orientação e não regressão da leitura do vôlei. Registrar decisões de persistência e nomes reais em `ESTADO.md`.

## Verificações obrigatórias

- Criar futebol, fechar/reabrir, ajustar relógio e passar para segundo tempo. O relógio salvo e o período continuam coerentes; eventos futuros usam timestamp relativo ao período e minuto cumulativo.
- Tocar e arrastar no campo em tamanhos diferentes e após espelhar a vista. A posição gravada e o ponto reconstruído ficam dentro do campo e retornam ao mesmo lugar; o gesto de vôlei continua funcionando.
- Montar/desmontar o campo 100 vezes sem listeners duplicados; cancelar arrasto fora do campo sem gravar posição falsa.
- Abrir backup antigo de vôlei sem `sport`; não alterar placar, rotações, quadra ou eventos originais. Nenhum pacote novo só para desenhar campo.

## Limite desta etapa

Não criar a captura de passe, posse ou analytics agora. Se o checkout já tiver estrutura multi-esporte, adaptar o contrato a ela; evitar refatoração grande. Informe os caminhos reais encontrados e qualquer incompatibilidade no `ESTADO.md`.

## Prompt para Luna

> Leia `AGENTS.md`, o plano geral Futebol StatsBomb e este F1. Faça somente F1 no checkout local. Localize e reutilize a quadra gestual funcional e o pipeline de persistência do vôlei; implemente futebol na mesma aplicação, geometria do campo e conversão 0–120 × 0–80, orientação por equipe/período, contrato canônico de eventos e relógio. Teste gesto em ambas as modalidades, reabertura e backup legado. Atualize `ESTADO.md` com arquivos reais, verificações e próxima etapa. Preserve alterações locais e não faça F2–F5.
