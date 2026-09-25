# M5 — Reformulação do registro de futebol

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Estado:** reaberta após feedback do usuário. **Escopo desta revisão:** plano e prévia; não houve implementação. **Dependências técnicas existentes:** M3/M4; reutilizar a base atual.

## Direção que substitui a especificação anterior de interface

O registro deve permitir acompanhar a posse e marcar deslocamentos, trocas e finalizações em uma tela leve. O usuário rejeitou o excesso de informações, janelas e operações. Não continuar acrescentando coleta por posse à tela detalhada.

A autorização atual é **plano e prévia primeiro**. Os prompts de implementação abaixo servem para uma solicitação futura ao Luna; não executar automaticamente nesta rodada.

## Diagnóstico verificado no código

`FootballScoutScreen.tsx` mantém simultaneamente controle observado, três seletores de identidade/posse, painel de ações, pressão, perguntas táticas, formulários de resultado, confirmação e histórico. M5 acrescentou marcos nesse mesmo componente. `Observar continuamente` habilita o fluxo rápido, mas os controles detalhados continuam presentes. Perda e chute ainda usam o formulário antigo. O E2E de M5 verifica inclusive que perdas/chutes permanecem detalhados.

Isso comprova funcionamento de gravação, não simplicidade de operação. A apresentação precisa ser substituída no modo ao vivo. Dados e motor existentes continuam válidos; não reescrever o domínio inteiro ou mexer no vôlei.

## Tela proposta

1. **Cabeçalho único:** equipes, placar, período/tempo e pausa da coleta. Sem placares e menus duplicados.
2. **Campo dominante:** última posição observada e, opcionalmente, até cinco pontos da posse atual. Sem mapas, cartões estatísticos ou legenda extensa.
3. **Uma faixa de operação:** seletor de equipe A/B, Disputa, Finalizar, Parada e Desfazer. Os nomes das equipes já fazem a troca; não adicionar outro seletor de “equipe do evento” ou “posse observada”.
4. **Uma linha contextual:** instrução curta; durante chute, opções de resultado ocupam essa região. Não abrir janela, gaveta, painel lateral ou formulário empilhado. Reservar espaço para não mover o campo enquanto o operador clica.
5. **Feedback discreto:** último acontecimento ou erro acionável; não emitir toast e confirmação a cada ponto.

O estado inicial de quem controla deve ser explícito. A primeira escolha registra início observado, não recuperação inventada. Um comando inicial pode começar a coleta; não exigir alternar entre modos de observação para tornar o campo útil.

## Interações essenciais

| Intenção | Comportamento |
|---|---|
| Bola se deslocou | Um toque no campo salva posição e tempo, sem selecionar ação nem confirmar |
| Adversário controlou | Um toque na outra equipe registra imediatamente a troca, mesmo sem novo ponto; o próximo toque informa posição |
| Bola dividida | Disputa interrompe o tempo de controle; nova equipe é escolhida quando houver controle observado |
| Chute | Finalizar → tocar origem → escolher resultado na faixa, sem botão Confirmar adicional |
| Não deu para completar chute | Salvar ocorrência com resultado pendente; continuar o jogo e revisar depois |
| Bola parada | Parada encerra segmento; selecionar equipe no reinício abre o próximo, mesmo sendo a mesma |
| Engano | Desfazer em um toque, com reprojeção coerente |

Atalho F pode armar finalização; Escape cancela somente o gesto ainda não registrado. Atalhos não substituem controles acessíveis. A prévia demonstra clique; arraste contínuo não é requisito de implementação.

## O que sai da composição principal

Seletores de atleta/receptor, passe/condução/drible/desarme, pressão, saída/estrutura, quebra de linha, tipo de recepção, força do chute, coordenadas numéricas, exportação, ajuste de placar e histórico completo. Não recolocar esses campos em várias caixas recolhíveis ao redor do campo.

O usuário aprovou a composição e pediu acesso **opcional** a pressão, saída, roubada e jogador. Esses quatro itens ficam atrás de um único botão **Detalhes**, uma categoria por vez, na faixa existente, conforme [R4](reformulacao-futebol/R4_DETALHES_OPCIONAIS.md). No detalhe eventual, selecionar salva e fecha; ignorar não impede nenhuma operação. Não abrem automaticamente nem permanecem como formulários ao redor do campo.

Em 22/09/2026, o usuário pediu uma evolução explícita: permitir fixar botões de altura da pressão ao ativar sua coleta e destacar trechos relevantes para completar voluntariamente. A [pasta registro-assistido](../registro-assistido/README.md) especifica essa exceção em A1–A4, dentro da R4. Somente a linha de pressão escolhida pelo scouter fica fixa; sugestões não abrem perguntas automaticamente. Prévia anterior preservada, extensão ainda somente planejada.

Revisão completa, histórico, exportação e demais campos continuam fora da composição de coleta. M7 trata enriquecimento mais extenso; o registro detalhado pode continuar separado. Esta instrução substitui a proibição anterior de qualquer detalhe ao vivo, sem autorizar recompor os painéis antigos.

## Regras de dados que não podem desaparecer na simplificação

- Troca imediata sem posição é válida. Não reutilizar silenciosamente a posição anterior como local da perda; mostrar último ponto antigo como tal, com distinção visual, até nova observação.
- Troca sem causa conhecida não vira passe errado/desarme nem inventa autor. Registrar perda e ganho como uma transição, sem dupla contagem.
- Pontos indicam posições observadas; ligações não são passes reais nem tracking. Não seguir a bola automaticamente entre pontos.
- Chute não garante fim da posse; permitir rebote e outro chute. Controle posterior não observado deve permanecer desconhecido, sem conceder posse ao goleiro/adversário automaticamente.
- Resultado pendente não pode virar gol/defesa/fora por padrão. Capturar tempo e identidade da ocorrência antes dos detalhes; resultado posterior deve editar esse chute, sem afetar a posse atual.
- Aguardar detalhes de um chute não pode bloquear marcação, troca ou segundo chute. Se mais de um ficar pendente, preservar IDs e oferecer revisão sem modal.
- Pausa da coleta cria lacuna; não pausa o relógio corrido do jogo. Retomar exige controle observado, sem completar o intervalo perdido.
- Salvamento mantém ordem e erros recuperáveis. Não perder cliques enquanto uma requisição está em andamento, duplicar ao tentar novamente ou apresentar pendência como salva.

## Rodadas curtas para o Luna

1. [R1 — tela mínima e deslocamento](reformulacao-futebol/R1_TELA_MINIMA.md).
2. [R2 — trocas e finalizações rápidas](reformulacao-futebol/R2_TROCAS_E_FINALIZACOES.md).
3. [R4 — detalhes opcionais](reformulacao-futebol/R4_DETALHES_OPCIONAIS.md), ampliada em [A1–A4](../registro-assistido/README.md) para registro assistido; executar um recorte por solicitação.
4. [R3 — verificação visual e operacional](reformulacao-futebol/R3_VALIDACAO_OPERACIONAL.md).

A ordem é R1 → R2 → R4 → R3; IDs antigos foram preservados. Cada rodada tem seu próprio MD. Não repetir M0–M4 nem implementar M7/M8 antes de corrigir a coleta. Depois de R3, voltar ao piloto M6 com o fluxo aprovado para avaliação; aprovação de testes de software não equivale à aprovação humana.

## Prévia e limite de validade

Prévia atual com detalhes opcionais: `/home/lucasregis/.codex/visualizations/2026/09/21/01a0c3e4-6c4d-7781-bf94-93534fad0a03/futebol-detalhes-opcionais.html`. A prévia mínima aprovada permanece preservada como `futebol-registro-minimo.html` no mesmo diretório. Usa equipes fictícias e estado de demonstração, sem conexão com banco/partidas. Explora marcação, troca, disputa, chute/resultado pendente, parada e desfazer. O temporizador é ilustrativo; persistência de produção, histórico completo e revisão não foram implementados.

O objetivo é avaliar a composição e o esforço de interação antes de alterar o aplicativo. Não copiar a prévia como motor de dados; implementar os comportamentos sobre os serviços existentes.
