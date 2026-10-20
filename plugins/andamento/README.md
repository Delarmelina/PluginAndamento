# Andamento

Plugin do Codex para acompanhar etapas, progresso e tempo estimado por conversa.

## Instalação e execução

O plugin inclui o servidor MCP autocontido em `dist/server.mjs`, e os manifestos apontam diretamente para esse arquivo. A instalação pelo marketplace não precisa executar `npm install`, ter `node_modules` na pasta do plugin nem acessar o registry do npm em tempo de execução. É necessário apenas Node.js 18 ou superior.

Ao alterar o código do servidor, regenere o bundle e teste antes de publicar:

```sh
npm ci
npm run build
npm test
```

`npm ci` instala as ferramentas de desenvolvimento de acordo com o `package-lock.json`; `esbuild` reúne o servidor e suas dependências de produção em um único arquivo versionado. O diretório `dist/` deve acompanhar toda alteração publicada do servidor. Depois de atualizar o plugin no Codex, reinicie o aplicativo para recarregar o MCP.

## Contexto pessoal opcional dos hooks

Os hooks têm instruções genéricas e não presumem nome, aprovação ou preferências de quem usa o plugin. Para acrescentar orientações específicas à sua instalação, defina a variável de ambiente `ANDAMENTO_CONTEXT` antes de abrir o Codex. O valor é acrescentado ao contexto dos hooks `SessionStart` e `UserPromptSubmit`; o plugin limita esse acréscimo a 8.000 caracteres.

No Windows PowerShell, para persistir a configuração no perfil do usuário:

```powershell
[Environment]::SetEnvironmentVariable('ANDAMENTO_CONTEXT', 'Use o painel lateral e estime o tempo ativo por etapa.', 'User')
```

Feche e reabra o Codex para que o aplicativo herde a nova variável. Para uma configuração temporária no terminal atual, use `$env:ANDAMENTO_CONTEXT = '...'` antes de iniciar o Codex por esse terminal.

No macOS/Linux, exporte `ANDAMENTO_CONTEXT` no ambiente que inicia o Codex. Não coloque informações confidenciais nesse texto: ele é encaminhado como instrução de contexto ao agente.
