# T05 — Pressão fixável por escolha do scouter

**Versão:** 0.5 proposta. **Dependência:** T04. **Resultado:** registro pontual da altura da pressão em um toque.

## Entradas de código

Composição T04, contratos T03, `src/domain/football/FootballOrientation.ts`, tipos/serviços de pressão. Reutilizar preferências existentes, distinguindo preferência de fato da partida.

## Implementar

Detalhes → Pressão → **Registrar pressão** fixa uma linha compacta: **[Equipe] pressiona · Alta · Média · Baixa · Sem pressão · Não observada · Ocultar**. Desligado inicialmente. Persistir preferência por operador/partida se suportado, sem registrar fato ao restaurá-la.

Alta/Média/Baixa significam altura em relação ao campo da equipe pressionante: adiantada/intermediária/recuada. Não são intensidade ou número de jogadores. Forma Individual/Coletiva continua no detalhe eventual, sem segunda linha permanente.

- Equipe indicada é adversária do controle observado. Sem controle conhecido, disputa, parada, pausa ou intervalo: anotação desabilitada, sem mudar o controle.
- Toque salva snapshot e mantém botões, sem confirmação. Realce é apenas feedback de gravação, não estado herdado. Pode indicar “Última observação” e hora; não preencher pontos futuros.
- Trocar controle limpa realce e muda equipe. Ocultar preserva dados. Não interpolar intervalos nem deduzir pressão contínua.
- Linha no fluxo, fora do campo, sem sobreposição. Resultado do chute conserva sua faixa. Durante marcação de origem/resultado ativo, pressão fica desabilitada; adiar resultado libera coleta normal.

## Localização e orientação

Vincular último ponto somente se mesma posse/equipe/período, sem lacuna e idade de até **3 segundos**. Guardar ID/tempo/idade. Esse limite é hipótese inicial para piloto, não garantia de posição atual. Posição é da bola sob pressão, não dos defensores.

Sem ponto elegível, salvar sem posição e permitir revisão posterior; nenhum toque espacial obrigatório. Classificação Alta não fabrica coordenada, nem coordenada gera Alta automaticamente. Normalizar comparações por equipe pressionante e período; orientação desconhecida impede análise direcional, não registro.

Sem pressão é ausência observada; Não observada é desconhecido. Forma e altura podem estar incompletas. Se o scouter corrigir o mesmo snapshot de pressão presente para ausência, limpar atributos incompatíveis nele e preservar histórico de correção; não modificar outros snapshots.

## Aceite e testes

Um toque por snapshot, nenhuma interação extra com recurso desligado. Testar troca de equipe, ponto velho/ausente, lados invertidos, anotações repetidas intencionais, pausa, desfazer, falha/reload e sem herança. Layout 1366×768/1024×768/móvel com chute e linha fixada; campo não se move durante gesto. Typecheck/testes pertinentes. Atualizar T05; próxima T06.
