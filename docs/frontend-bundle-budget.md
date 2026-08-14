# Budget do bundle frontend

As páginas são carregadas com `React.lazy` na fronteira das rotas. O shell compartilhado permanece no chunk inicial e cada página é baixada somente quando sua rota é acessada.

## Medição de referência

Build de produção medido em 14 de agosto de 2026, com Node.js 22 e Vite 8.2.1:

- JavaScript inicial: **576,14 KiB minificado / 168,76 KiB gzip**.
- Budget: **220 KiB gzip** para a soma dos scripts referenciados diretamente por `dist/index.html`.
- Folga inicial: aproximadamente 30%, suficiente para variações pequenas sem ocultar crescimento relevante do shell.

CSS, fontes e chunks lazy são exibidos pelo Vite, mas não entram neste budget de first-load JavaScript. Eles devem ganhar budgets próprios se a medição de produção apontar necessidade.

## Validação

`npm run build` executa o build e depois `npm run bundle:check`. O verificador lê os scripts iniciais do HTML gerado, calcula gzip com a biblioteca padrão do Node e falha se a soma ultrapassar 220 KiB. O job frontend da CI usa esse mesmo comando.

O limite só deve ser alterado junto com uma nova medição registrada neste documento e uma justificativa para o aumento ou redução.
