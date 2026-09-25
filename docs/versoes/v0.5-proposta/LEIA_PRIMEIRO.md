# Plano 0.5 proposta — posse, menus e elencos

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão de planejamento:** 0.5 proposta. **Base declarada:** aplicativo 0.4.0. **Data:** 21/09/2026. **Estado:** implementação parcial prévia; M5 reaberta para reformulação. Consulte ESTADO.md.

## Resultado desejado

1. Futebol com modo **Por posse**, baseado em controle, marcos espaciais, perdas e finalizações, viável para um operador ao vivo.
2. Menus mais claros nas duas modalidades, com foco na tarefa e acesso fácil à partida em andamento.
3. Cadastro de atletas e elencos por campos separados e linhas editáveis, sem exigir vírgulas, barras ou espaçamento exato; reutilização de equipes e colagem com prévia.

**Prioridade atual:** reformular o registro de futebol conforme [M5 revisada](etapas/M5_REGISTRO_POR_POSSE.md), na ordem R1 → R2 → R4 → R3. O usuário pediu **plano e prévia primeiro**; esta revisão não implementa o aplicativo. As etapas anteriores já têm entregas parciais ou concluídas registradas em ESTADO.md, e não devem ser reiniciadas.

A composição ao vivo terá campo dominante e uma faixa de comandos. Contexto pode ser anotado opcionalmente por um único acesso Detalhes, conforme R4; revisão extensa permanece fora dessa composição. Não continuar ampliando a tela atual com mais painéis.

Atualização de 22/09/2026: a [pasta registro-assistido](registro-assistido/README.md) amplia R4 em A1–A4. O scouter poderá fixar botões de altura da pressão por opção explícita e ativar sugestões discretas de trechos relevantes. Essa linha opcional é uma exceção autorizada à composição mínima, sem restaurar formulários permanentes. Os novos recursos estão somente no plano; a prévia anterior não foi alterada.

## Como trabalhar com este pacote

- Ler o arquivo de instruções real da raiz, ` AGENTS.md` (o nome tem um espaço inicial), `git status`, este guia, [ESTADO.md](ESTADO.md) e a etapa pedida.
- Executar **somente a macroetapa solicitada**, observando suas dependências. Se ela já estiver parcialmente implementada, completar apenas o necessário após inspeção.
- A árvore contém mudanças preexistentes. Não usar reset/clean, descartar edições, formatar o repositório inteiro, atualizar dependências ou criar outro projeto para executar o plano.
- O código e os testes atuais são a base para implementação. Planos anteriores são referências históricas, não ordens adicionais para a rodada.
- Preservar dados, IDs, partidas antigas, histórico corrigível, persistência local e regras específicas de vôlei/futebol.
- Não fazer commit, push, publicar, gerar instaladores ou mudar `package.json` automaticamente. O nome do pacote não autoriza lançar a versão.
- Ao terminar: registrar arquivos, comportamento, verificações reais, limitações e próxima etapa em ESTADO.md. Parar sem executar a próxima.
- Uma validação automatizada não substitui o teste de uso ao vivo; uma análise de código não vale como teste executado.

## Ordem e dependências

| Etapa | Entrega | Depende de |
|---|---|---|
| [M0](etapas/M0_BASE_E_CONTRATOS.md) | Auditoria curta e contratos de navegação, elenco e posse | Nenhuma |
| [M1](etapas/M1_MENUS_E_NAVEGACAO.md) | Menu global e navegação da partida nas duas modalidades | M0 |
| [M2](etapas/M2_CADASTRO_RAPIDO_ATLETAS.md) | Editor de atletas/elenco e colagem com prévia | M0 |
| [M3](etapas/M3_CRIACAO_E_REUSO_DE_EQUIPES.md) | Nova partida usando o editor e equipes reutilizáveis | M1, M2 |
| [M4](etapas/M4_DOMINIO_POSSE_E_MARCOS.md) | Contrato persistido e projeção de posses/marcos | M0 |
| [M5](etapas/M5_REGISTRO_POR_POSSE.md) | Reformulação minimalista em R1/R2/R4/R3 | Base M3/M4 existente |
| [M6](etapas/M6_PILOTO_OPERACIONAL.md) | Teste em velocidade normal e ajustes de carga | M5 |
| [M7](etapas/M7_PRESSAO_SAIDA_E_REVISAO.md) | Contexto tático somente na revisão | M6 aprovada operacionalmente |
| [M8](etapas/M8_ANALISES_POR_POSSE.md) | Análises compatíveis com a coleta | M7 |
| [M9](etapas/M9_VALIDACAO_E_ENTREGA.md) | Regressão, compatibilidade e documentação de entrega | M1–M8 |

M1/M2/M4 têm partes independentes, mas a execução padrão é sequencial para facilitar a retomada. Não é necessário ler todas as etapas para executar uma delas.

## Decisões que valem para todas as etapas

- Preservar dados e os modos funcionais do vôlei. A coleta mínima e o formulário detalhado de futebol terão composições separadas; não montar ambos simultaneamente. Não converter passes em marcos ou marcos em passes.
- Posição esparsa não prova passe, condução, quebra de linha, autoria intermediária ou trajetória contínua.
- A bola na tela indica a última posição observada e sua idade. Não exigir arraste contínuo nem clique por contato.
- Estado de controle: equipe A/B, disputa, parada, desconhecido. Troca exige controle adversário observado; chute com rebote pode manter a posse.
- Atleta desconhecido é um estado do registro, não um jogador fictício cadastrado. Número da camisa não é identidade global.
- Papéis do vôlei não podem ser a lista de posições do futebol. Camisa/função podem variar entre equipes/partidas; alterações futuras não reescrevem jogos antigos.
- Fluxo principal do cadastro: campos de camisa e nome separados; função específica opcional; adicionar linha com Enter ou botão. Texto separado por delimitadores é só opção de importação com revisão.
- Nome completo, acentos, apóstrofos e espaços não podem ser partidos em jogadores diferentes. Entradas ambíguas exigem correção na prévia, sem descarte silencioso.
- Desconhecido, não observado, zero e não se aplica são diferentes. Indicadores precisam de denominador e cobertura próprios.

## Escopo excluído

Tracking de vídeo, reconstrução automática de passes, IA obrigatória, nuvem/autenticação, novas modalidades, trocar stack, refazer motor de vôlei ou inventar calibração de xG. O modelo local existente só aparece com fonte, limitações e elegibilidade preservadas.

## Arquivos de apoio

- [Referência conceitual de posse](REFERENCIA_SCOUT_POR_POSSE.md): detalhe da proposta inicial; consultar apenas se necessário.
- [Mapa técnico](MAPA_TECNICO.md): caminhos reais inspecionados.
- [Prompts](PROMPTS_LUNA.md): um por macroetapa.
- [Estado](ESTADO.md): único acompanhamento vigente deste pacote.
