# Decisões de escopo da 0.45

## Entram agora
- fechamento mínimo das dívidas 0.4 que contaminam analytics;
- projeção sequencial por rally;
- Markov/transições;
- valor observado de estados/transições;
- contexto espacial `x,y` preservado na projeção;
- análise espacial por origem, destino e trajetória;
- comparação de regiões/células com baseline da ação;
- mapa de probabilidade/valor espacial com amostra explícita;
- padrões antes de ponto/erro;
- perguntas táticas determinísticas, incluindo perguntas espaciais;
- painel Sequências + Valor espacial;
- BYOK Gemini opcional para interpretação;
- exportação auditável dos novos resultados.

## Decisão central sobre `x,y`

`x,y` **não vira estado Markov bruto**. Coordenadas e regiões são contexto analítico. O sistema pode condicionar o Markov por região e construir superfícies de valor, evitando explosão de estados e sparsidade.

## São preparados, mas não implementados
- perfil de sequência reutilizável por esporte;
- perfil espacial reutilizável por esporte;
- futura integração de dados de carga;
- futura identidade compartilhada de atleta;
- possibilidade de provider de IA além de Gemini.

## Ficam para 0.5+
- núcleo de esportes de invasão;
- futebol;
- futsal;
- basquete;
- modelos xT/xG específicos;
- análise de vídeo;
- ingestão automática de tracking;
- banco remoto/unificado real;
- histórico multi-organização;
- calibração robusta de probabilidade com grande base externa;
- modelos espaciais avançados que exijam dependências científicas pesadas.

## Motivo

A 0.45 deve provar que a arquitetura atual consegue transformar **eventos em sequências, sequências + espaço em valor e valor em explicações**. O Scout Trainer já registra origem/destino; portanto, ignorar o espaço empobreceria justamente o diferencial do produto. A solução preserva o núcleo Markov pequeno e usa `x,y` como contexto para permitir análises táticas úteis sem criar milhares de estados raros.
