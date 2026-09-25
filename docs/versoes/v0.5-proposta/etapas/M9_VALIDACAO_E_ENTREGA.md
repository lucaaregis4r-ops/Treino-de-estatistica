# M9 — Validação integrada e entrega documentada

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M1–M8 concluídas com evidências.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M9; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Fechar o pacote sem transformar planejamento em anúncio de release.

## Cenários finais

1. Futebol: criar sem elenco, registrar Por posse, marcar pressão/saída, perder/recuperar, chutar com rebote, corrigir, fechar/reabrir, analisar e exportar/importar backup.
2. Futebol Detalhado: passes/conduções e eventos antigos continuam funcionando; modos coexistem sem duplicar ações nem extrapolar cobertura.
3. Vôlei: cadastro por linhas e colagem, equipe reutilizada, lineup/líbero, registro gestual/código, placar/rotação, resumo e relatório preservados.
4. Menu: rascunhos, retorno à partida certa, filtros, foco/teclado/toque e acesso a recursos secundários.
5. Identidade: camisa distinta em equipes/partidas sem reescrever histórico; homônimos; legado sem modalidade; edição/desativação e recuperação de lote.
6. Persistência: backup antigo/novo, correção/replay, desfazer atômico, reload, falha de salvamento e exclusão dos marcos locais no subconjunto StatsBomb.

## Verificação proporcional

Rodar testes relevantes dos módulos alterados, typecheck, lint do escopo e build; executar fluxos integrados em navegador. Ampliar para suíte global quando necessário ao conjunto das mudanças e registrar falhas preexistentes separadamente das introduzidas, sem alegar baseline limpo sem evidência. Não repetir suítes sem mudança ou preocupação nova.

Inspecionar 1366×768, 1024×768 e móvel. Evidências em `output/posse-v0.5/` quando geradas, sem dados pessoais reais desnecessários. O piloto M6 é obrigatório para alegar viabilidade operacional; se pendente, a entrega permanece parcial.

## Entrega

Criar `ENTREGA.md` e `VALIDACAO.md` neste pacote, atualizar README/CHANGELOG e ESTADO.md com comportamento realmente implementado, testes, limitações, caminhos das evidências e instruções de uso. Não alterar versão do pacote, publicar, criar instalador ou apagar artefatos antigos automaticamente. Marcar concluído apenas o que tiver sido implementado e verificado; identificar pendências reais.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M9_VALIDACAO_E_ENTREGA.md.
Execute somente M9, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
