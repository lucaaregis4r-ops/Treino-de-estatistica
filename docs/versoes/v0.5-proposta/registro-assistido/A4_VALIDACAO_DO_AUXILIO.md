# A4 — Verificar se o auxílio ajuda

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta / R4 ampliada. **Estado:** planejada. **Dependências:** A1/A2/A3. **Escopo:** validação dirigida da extensão; não substitui R3 nem piloto M6.

## Verificações de software

1. Opções desligadas: mesmo fluxo mínimo, sem perguntas ou passos adicionais. Marco e troca continuam com um toque; detalhe não bloqueia chute.
2. Pressão ligada: um toque por observação, botões disponíveis, equipe pressionante correta, sem valor herdado, localização ausente/antiga respeitada. Troca de lado não inverte a normalização.
3. Sugestões ligadas: no máximo um destaque no campo atual, nenhuma janela automática; ignorar durante o jogo inteiro é permitido. Resultado pendente e correção do chute têm prioridade.
4. Revisão: passe e domínio juntos com autores distintos, ação sem autor, trecho sem posição exata, voltar ao vivo sem alterar controle/relógio. Não confirmar ações pelo silêncio.
5. Persistência: recarga/backup, confirmação repetida, desfazer fonte e falha recuperável. Candidatos ignorados não ressurgem sem mudança material. Estatísticas não contam sugestões nem respostas invalidadas.
6. Inspeção em 1366×768, 1024×768 e 390×844, além de largura de 320 px: todas as combinações ligado/desligado, pressão com chute, toque/teclado, foco e nenhum controle sobre o campo. Ativar recurso não desloca campo durante um gesto.

Ler os testes de tela/serviço e contratos existentes antes de criar cobertura. Executar testes pertinentes, typecheck e build. Registrar os comandos e resultados reais; não marcar teste humano como realizado por causa de automação.

## Medidas para o piloto M6

Comparar a composição mínima com pressão/sugestões ativadas em trechos comparáveis de jogo em velocidade normal. Alternar a ordem dos modos ou usar trechos diferentes para reduzir efeito de memória. Medir: omissões/atraso de chutes e trocas, toques adicionais por minuto, esforço percebido e tempo para voltar à coleta.

Para sugestões: registrar quantas foram oferecidas, abertas, consideradas úteis, confirmadas ou ignoradas, com tempo de revisão. Revisão pausada do vídeo é a referência para avaliar perdas; quantidade de confirmações, sozinha, não prova que a regra encontra lances importantes.

Para pressão: registrar a proporção com posição elegível e se os termos Alta/Média/Baixa foram compreendidos de forma consistente. Não aumentar cliques espaciais obrigatórios para melhorar artificialmente cobertura.

Critério de decisão: o operador consegue manter a captura principal e considera útil o auxílio. Se houver sobrecarga, primeiro reduzir frequência/destaque das sugestões ou mantê-las somente na revisão; não compensar com mais painéis. Não fixar limiares de ganho inventados antes de obter a linha de base.

## Encerramento

Atualizar [ESTADO](../ESTADO.md) distinguindo implementação verificada, composição aceita e piloto ainda pendente. R4 só se encerra com itens originais e A1–A4 atendidos; a próxima rodada é R3, que integra a tela inteira. M6 permanece o aceite humano. M7/M8 continuam posteriores, sem relatórios novos nesta etapa.

## Prompt para o Luna

```text
Leia docs/versoes/v0.5-proposta/ESTADO.md e registro-assistido/README.md
e registro-assistido/A4_VALIDACAO_DO_AUXILIO.md dentro desse pacote.
Execute somente A4 após A1/A2/A3, verificando a R4 completa. Registre o que foi
testado e o que depende de piloto humano; não invente medidas operacionais.
Atualize ESTADO.md e pare antes de R3.
```
