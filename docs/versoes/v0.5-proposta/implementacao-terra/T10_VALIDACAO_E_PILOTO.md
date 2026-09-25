# T10 — Validação integrada e piloto humano

**Versão:** 0.5 proposta. **Dependência:** T01–T09. **Resultado:** distinguir software funcionando de coleta viável. Não declarar piloto com automação.

## Software

Ler testes afetados de UI/domínio/serviço e `e2e/m5-possession-recording.spec.ts`, `e2e/m3-teams-reuse.spec.ts`, `e2e/football-redesign.spec.ts`. Atualizar exigências de formulário antigo que contrariam T01/T02, preservando cobertura útil de dados e falhas.

- Futebol: criar sem elenco, marcar, trocar, disputa, parada, pressão/saída/roubada opcionais, chute/rebote/pendente, novo controle, corrigir evento antigo e desfazer. Detalhado continua funcional, sem duplicar eventos.
- Assistência: desligado mantém caminho mínimo; ligado não abre perguntas. Até um destaque atual, pressão por toque, revisão com múltiplas ações/autoria desconhecida e volta segura.
- Persistência: backup antigo/novo, recarga, retry, ordem de eventos e invalidação; candidatos não entram como ações. Exportação StatsBomb continua limitada ao seu contrato.
- Vôlei: cadastro por linhas, reuso, lineup/líbero, gestual/código, placar/rotação, resumo/relatório preservados. Navegação protege rascunhos nas duas modalidades.
- Inspeção em 1366×768, 1024×768, 390×844 e largura 320 px; pressão ligada com chute/revisão, teclado/toque, nenhum comando cobrindo campo ou overflow horizontal. Campo não se move durante gesto.

Executar testes pertinentes, typecheck, lint do escopo e build. Ampliar suíte quando o conjunto de alterações justificar; não mascarar falhas preexistentes como aprovadas. Guardar evidências em `output/posse-v0.5/` quando geradas, sem dados pessoais desnecessários.

## Piloto de uso

Reutilizar [RELATORIO_PILOTO_M6.md](../RELATORIO_PILOTO_M6.md) como registro, sem criar relatório concorrente. Operador humano acompanha trecho autorizado de 10–15 minutos em velocidade normal, com trocas/paradas/chutes. Comparar modo mínimo e assistência usando trechos comparáveis ou ordem alternada para reduzir efeito de memória.

Medir interações por minuto/posse, atraso, omissões de chute/troca, correções, esforço e retorno à coleta. Sugestões: oferecidas/abertas/úteis/confirmadas/ignoradas e tempo para revisar. Pressão: posição elegível/ausente e compreensão de altura/forma. Revisão pausada do trecho serve de referência; quantidade de confirmações não prova qualidade de seleção.

Marco/troca devem manter um toque; chute usual três; pressão um toque adicional quando escolhida. Não inventar meta numérica de ganho antes de medir linha de base. Se sobrecarregar, reduzir convites/destaques ou mantê-los apenas na revisão; não remediar com mais painéis.

## Estado e passagem

Sem operador/trecho, concluir as verificações possíveis, registrar **Verificada tecnicamente / Aguardando piloto** e explicar a lacuna. Não refazer testes de software para fingir suprir piloto. T11 só fica elegível após aceite operacional ou mudança explícita desse requisito pelo usuário. Atualizar T10 e relatório; nunca marcar T inteira concluída sem evidência humana.

## Registro vigente — 23/09/2026

**Estado:** Verificada tecnicamente / Aguardando piloto. As regressões pertinentes, testes de domínio, typecheck, lint dirigido, build e capturas automatizadas nos quatro viewports foram executados; as evidências estão em `output/posse-v0.5/` e no registro T10 de `ESTADO.md`. A cobertura antiga que exigia `Iniciar` no fluxo inicial foi atualizada para o modo mínimo vigente, mantendo o caminho detalhado como compatibilidade explícita após recarga.

Não há neste checkout mídia de futebol autorizada de 10–15 minutos nem operador humano. Logo não foram preenchidas métricas de interação, atraso, omissão, correção ou esforço e não há aceite operacional. O único relatório é `RELATORIO_PILOTO_M6.md`; T11 não é elegível até o piloto ou alteração explícita desse requisito.
