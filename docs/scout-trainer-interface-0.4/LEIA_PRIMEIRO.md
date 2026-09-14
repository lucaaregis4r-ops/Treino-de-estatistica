# Scout Trainer 0.4 — plano de interface para execução no Codex

Lucas Regis · 12/09/2026 · Direção proposta: ferramenta de análise de voleibol, com verde profundo, quadra de tom mineral e hierarquia clara.

## Como usar

1. Extraia esta pasta dentro de `docs/` do seu projeto. Caminho recomendado: `docs/scout-trainer-interface-0.4/`.
2. Abra `referencia/interface.html` no navegador. É uma referência de composição com dados fictícios e interações demonstrativas; não é uma implementação do Scout Trainer.
3. No Codex, com o repositório local aberto e o modelo escolhido por você, use o comando de `PROMPTS.md`. Comece pela U0.
4. Execute uma etapa por solicitação. Cada etapa deixa o projeto utilizável e atualiza `ESTADO.md`.
5. Para consultar tudo em um documento, use `PLANO_COMPLETO.md`. Para executar, o modelo deve ler apenas os documentos comuns e a etapa atual.

O plano foi escrito para reduzir ambiguidades de execução para o 5.6 Luna. Não depende de uma capacidade exclusiva desse modelo e não promete consumo, duração ou execução sem falhas. Especificação fechada + implementação pequena + verificação visual é a estratégia proposta. Um plano não substitui a inspeção da interface renderizada.

## Base e limite da análise

Foram analisadas as seis capturas enviadas: Início, Partidas, Registro gestual, Registro visual e duas posições da página Análise. Também foram consultados a árvore do repositório, `package.json`, componentes de telas e trechos dos componentes maiores e do CSS.

Referência remota: [Treino-de-estatistica, commit 7960bf4](https://github.com/lucaaregis4r-ops/Treino-de-estatistica/tree/7960bf4fe93f8d731e0ceaece314fabac253f89b), consultada em 12/09/2026. O `package.json` consultado indica 0.3.0. A tela enviada pelo usuário já mostra recursos posteriores, como Gestual e análises salvas. Portanto, o checkout local é a fonte de verdade para a execução. O código da aplicação não foi executado nesta elaboração; verificações do protótipo de referência não equivalem a testes do produto.

Não substituir o projeto local pelo remoto. Não reconstruir funcionalidades a partir de arquivos antigos. A etapa U0 reconcilia os caminhos e registra o que já existe. Os nomes de novos componentes neste pacote são propostas, e não afirmações de que já existem.

## Diagnóstico das capturas

| Evidência visível | Efeito na experiência | Decisão desta proposta |
|---|---|---|
| Nome enorme no Início e amplo vazio vertical | A entrada consome espaço antes de apresentar o trabalho disponível | Cabeçalho de 30 px, uma partida para retomar e lista útil logo abaixo |
| Botão limão repetido em todas as partidas | Muitas linhas parecem ter a mesma prioridade | Uma ação principal de página; ações das linhas com ênfase secundária |
| Rótulos e metadados muito pequenos no registro | Leitura exige atenção que deveria estar na jogada | Corpo de 14–16 px; contexto prioritário visível e demais dados sob comando explícito |
| Quadra castanha em registro e muitas caixas verdes encaixadas | A estrutura da ferramenta compete com a quadra | Uma superfície principal de captura, quadra mineral e agrupamento por espaço e divisórias |
| Seleções com tratamentos diferentes entre modos | Não fica igualmente evidente o que está escolhido | Estado selecionado com preenchimento, contorno e marca textual persistente |
| Placar aparece em mais de uma região e em tamanho pequeno | Contexto da partida fica disperso | Um cabeçalho de partida compartilhado e legível |
| Probabilidade ocupa o início da Análise; quadra fica abaixo | O acesso à distribuição espacial exige navegação vertical | Análise abre em Quadra; os outros grupos têm navegação própria |
| `excellent` e `serve` aparecem entre rótulos em português | Vocabulário interno chega à interface | Tradução centralizada de apresentação, preservando códigos e semântica |

Essas são avaliações de design sobre as capturas. Elas não demonstram como cada interação funciona nem permitem afirmar que a UI foi produzida por IA. O aspecto genérico decorre de decisões repetidas de hierarquia, composição e acabamento.

## Resultado desejado

Em poucos segundos, a pessoa deve reconhecer: qual partida está aberta, qual é o placar, qual ação está preparando, qual atleta ou ausência de identificação está selecionado, e se o registro foi concluído. A identidade vem da organização do trabalho do voleibol: placar, quadra, rotação, trajetória e leitura dos eventos.

Escopo: aparência, organização das telas, clareza de estados, navegação interna e acessibilidade dos fluxos existentes. Manter os quatro modos locais, registro sem atleta, cobertura de equipes, trocas, histórico, filtros, análises salvas, seleção de gráficos e exportações que já estiverem implementados. Aplicar acabamento consistente às telas não mostradas nas imagens depois de inspecioná-las.

Funcionalidades ausentes, mudanças de regras de voleibol, novos cálculos, autenticação, nuvem, sincronização, nova biblioteca visual e nova arquitetura de persistência ficam fora deste redesenho. Registrar uma lacuna encontrada e continuar as partes independentes. Não criar botões de funções que o produto não oferece.
