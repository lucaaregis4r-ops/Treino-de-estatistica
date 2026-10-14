# Diretrizes de interface

Ao criar ou alterar telas do Scout Trainer, leia `docs/GUIA_VISUAL.md` e siga os tokens de `src/ui/styles/tokens.css` e os padrões de `src/ui/styles/sport-workbench.css`.

- Preserve a quadra/campo como área principal do registro e use navegação explícita para tarefas secundárias.
- Mantenha a linguagem visual compartilhada entre modalidades, respeitando a geometria e as regras de cada esporte.
- Reutilize as marcações compartilhadas dos mapas; não crie outra convenção de zonas nem altere coordenadas salvas para fins visuais.
- Verifique proporções, foco, ausência de sobreposição e rolagem horizontal em desktop, tablet e celular.
- Quando uma expansão exigir uma nova regra visual compartilhada, atualize o guia junto com o código.
