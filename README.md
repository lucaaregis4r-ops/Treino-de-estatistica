# Scout Trainer

Os documentos internos usados no planejamento, nas decisões e nos roteiros de implementação estão agrupados em [`vibecoding/`](vibecoding/). Eles não definem o nome do repositório nem do programa.

Aplicativo para registrar partidas, treinar códigos e analisar scouts de voleibol. Os dados ficam no dispositivo do usuário e podem ser exportados em JSON, CSV ou TXT.

## Usar no Windows

Baixe `Scout-Trainer-0.1.0-Portable.exe` na página de releases ou no link de compartilhamento do Google Drive. O programa é portátil: basta abrir o arquivo, sem instalação.

O Windows pode exibir um aviso por o executável não possuir assinatura digital. Nesse caso, confirme a origem do arquivo antes de executá-lo.

## Executar o projeto

Requisitos: Node.js 22 ou superior e npm.

```bash
npm install
npm run dev
```

## Verificar e compilar

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Para criar o executável portátil do Windows:

```bash
npm run build:exe
```

O arquivo será criado em `distribuicao/`.

## Publicar no GitHub Pages

1. Publique o conteúdo desta pasta em um repositório GitHub com a branch `main`.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **GitHub Actions**.
4. Envie uma alteração para a branch `main` ou execute manualmente o fluxo **Publicar no GitHub Pages**.

## Armazenamento e backup

Partidas, sessões e perfis são armazenados localmente no navegador ou no aplicativo. Para transferir os dados para outro dispositivo, exporte o backup JSON e use **Restaurar backup JSON** no outro dispositivo.

Chrome e Edge também permitem conectar uma pasta local na tela de resumo. Essa pasta pode estar sincronizada pelo Google Drive para computador.
