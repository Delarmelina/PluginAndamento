# Andamento

Prova funcional de um plugin local do Codex com painel por conversa.

## Estado verificado em 16/10/2026

### Direção atual — 0.1.7

A versão 0.1.7 orienta a criação de planos com granularidade proporcional ao escopo: em geral, 2–4 etapas para pedidos pequenos, 4–7 para médios e 8–12 ou mais para implementações grandes ou multifrentes. Não existe teto fixo; as etapas devem representar marcos verificáveis, sem fragmentar o plano por chamada de ferramenta.

### Base funcional — 0.1.6

A versão 0.1.6 acrescenta progresso estimado ponderado pela duração das etapas e tempo de execução restante. Cada plano pode registrar minutos estimados por etapa; o agente atualiza a estimativa percentual da etapa em execução nos marcos. O painel identifica os valores como estimativas, não inclui esperas externas e informa quando um bloqueio posterga o tempo restante. Planos antigos continuam funcionando e mostram “Sem estimativa” quando não têm duração registrada.

O código-fonte está atualizado e a verificação sintática passou. A instalação da 0.1.6 pelo CLI criou a pasta da nova versão, mas retornou “Acesso negado” ao ativá-la. O catálogo de ferramentas desta sessão ainda expõe o schema antigo, então a ativação não está confirmada. Não foi removido o cache nem alterada a ACL.

### Direção anterior — 0.1.5

Felipe esclareceu que o painel **já está na lateral desejada**, apesar de o host informar `displayMode: fullscreen`. A inferência de que isso significava ocupar a tela toda estava incorreta. A direção aprovada é manter exatamente essa lateral, retirar a exigência de PiP e mostrar o plano vinculado ao chat.

A versão 0.1.5 não chama requestDisplayMode, não abre janelas externas e não condiciona a leitura de etapas ao modo de apresentação. A abertura direta usa `ui://andamento/conversa.html`, sem seletor, com atualização a cada dois segundos. A rota de recurso antiga permanece compatível para não bloquear clientes já carregados. Hook e skill foram realinhados a essa preferência.

Instalação e habilitação da 0.1.5 confirmadas; quinze testes aprovados e skill validada. O painel já aberto continua executando o HTML antigo: fechar e reabrir essa aba lateral para carregar a correção, não apenas clicar no botão Atualizar antigo (que só consultava dados). A conferência visual pós-correção no host ainda depende dessa reabertura. A remoção da guarda PiP foi verificada em DOM com o modo fullscreen e sem API de mudança de modo.

### Histórico técnico até 0.1.4 — requisitos de PiP superados

- Versão 0.1.3 carregada no host: follow_progress foi chamada com o chat correto, mas Felipe mostrou um print com a mensagem “O aplicativo não aceitou o modo flutuante”. Isso confirma a falha visual, não sua causa definitiva. A verificação da UI consultava displayMode imediatamente após a solicitação e podia confundir atualização assíncrona com recusa.
- Versão 0.1.4 corrige a confirmação: observa openai:set_globals e ui/notifications/host-context-changed, espera até quatro segundos e informa os modos inicial, retornado e atual em caso de ausência de confirmação. Não desenha o checklist inline e não diz “nenhuma etapa vinculada” durante erro de apresentação. O botão permite nova tentativa somente por ação explícita do usuário. A abertura real PiP continua não validada.
- Reteste real da 0.1.4: print de Felipe mostrou `inicial: fullscreen; retorno: sem modo; atual: fullscreen`. A solicitação não produziu PiP confirmado nesta instalação, mesmo após a espera. Não repetir tentativas nem alegar sucesso com base nos testes. Alternativa proposta: janela independente compacta, vinculada explicitamente ao chat e com atualização automática, em vez de depender do modo PiP do host; ainda não implementada.
- Doze testes aprovados, incluindo as duas formas de confirmação assíncrona e recusa com diagnóstico explícito. As verificações anteriores cobrem chat explícito (ignorando widgetState de outro chat), ausência de seletor, consulta a cada dois segundos e acompanhamento de novos pedidos do mesmo chat. O teste MCP verifica que as ferramentas de dados não anunciam cartão e que a abertura direta declara apenas modo PiP.
- Skill validada pelo validador oficial disponível no ambiente.
- Gatilho de contexto confirmado em uma conversa real após Felipe reiniciar o aplicativo. SessionStart e UserPromptSubmit forneceram os identificadores reais do chat e do turno.
- A versão 0.1.1 carregou as quatro ferramentas na conversa real. O teste foi executado e Felipe confirmou a visualização, mas ela apareceu como cartão no chat, formato que ele recusou.
- O primeiro carregamento MCP falhou porque este Codex tratou `${PLUGIN_ROOT}` como texto literal em `.mcp.json`. A versão 0.1.1 usa o caminho absoluto do serviço neste computador. Os seis testes passaram novamente, com o teste MCP executando exatamente o comando declarado no manifesto. Se o projeto mudar de pasta, atualizar esse caminho antes de reinstalar o plugin.
- Na versão 0.1.2, `view_progress` consulta dados sem UI. `open_panel` é exclusivo do aplicativo e declara entradas `global` (barra esquerda) e `thread` (lateral da conversa), conforme a documentação oficial. O recurso suporta fullscreen/pip, sem declarar modo inline. O botão Flutuante usa `requestDisplayMode({mode:'pip'})` somente quando essa capacidade existe no host.
- Felipe achou a navegação da versão 0.1.2 trabalhosa. A versão 0.1.3 mantém a entrada manual opcional, mas adiciona abertura direta em PiP, com threadId obrigatório, seletor oculto e acompanhamento do plano atual do mesmo chat. Não repete abertura em cada etapa; uma janela já vinculada continua acompanhando novos pedidos. Se o usuário fechar a janela, o agente só reabre sob pedido.
- O recurso direto declara exclusivamente `availableDisplayModes: ['pip']`. A interface também solicita PiP quando necessário; sem confirmação após a espera, ou sem a API, não desenha o checklist como fallback inline. A posição e a abertura efetiva continuam sob controle do Codex e precisam ser verificadas no host real. Não há ferramenta de recarregamento disponível nesta conversa.
- Na tentativa seguinte, o chat ainda manteve o cliente MCP antigo sem nova inicialização. Registrei também o lançador explícito com `codex mcp add andamento -- node <caminho-absoluto>/server.mjs`. `codex mcp get andamento --json` confirmou o caminho corrigido. A configuração global e a do pacote apontam para o mesmo serviço; não criar um segundo servidor com outro nome. Falta recarregar o processo do aplicativo para validar o serviço no host.

## O que está incluído

- Interface MCP App com entradas `global` e `thread`, preservando a lateral aprovada por Felipe.
- `start_plan`, `update_step`, `get_progress` e `view_progress` sem cartão; `open_panel` reservado ao aplicativo.
- `follow_progress(threadId)` para abertura direta do painel lateral, com contexto explícito e sem seletor.
- Estados pendente, em execução, concluída, bloqueada e dispensada.
- Percentual estimado de 0–100% ponderado pela duração das etapas e estimativa de tempo restante, sem contar esperas externas.
- Histórico incremental e arquivos locais separados por identificador de conversa.
- Gatilhos SessionStart e UserPromptSubmit para instruir o agente em qualquer projeto, depois da revisão de confiança do aplicativo.
- Skill empacotada, sem depender de referências ao myPKA.

## Instalação local

Requer Node.js instalado. Primeiro instale as dependências do servidor a partir da pasta do plugin:

```powershell
cd plugins/andamento
npm ci
cd ../..
```

Para testar pelo checkout local, na raiz desta pasta:

```powershell
codex plugin marketplace add .
codex plugin add andamento@larry-local
```

Para instalar diretamente do repositório compartilhado, use:

```powershell
codex plugin marketplace add Delarmelina/PluginAndamento
codex plugin add andamento@larry-local
```

Depois, reabra o aplicativo ou inicie uma nova sessão para carregar ferramentas recém-instaladas. Revise os gatilhos no aplicativo quando a revisão estiver disponível, ou por `/hooks` no Codex CLI. A instalação não concede confiança automaticamente. Não usar opções para contornar a revisão.

Após instalar uma atualização, feche a aba lateral antiga e peça “abrir acompanhamento”. O agente usa a abertura direta, uma vez, com o identificador real desta conversa. A barra esquerda permanece como acesso manual opcional. Não solicitar mudança de modo: o host já oferece a posição lateral aprovada por Felipe. Não é uma modificação dos blocos nativos Resultados/Fontes. O agente não deve inserir checklists nem cartões inline no chat.

## Vinculação da conversa

**Desde 0.1.5:** follow_progress abre o painel vinculado ao threadId, sem negociar outro modo de exibição. A lateral confirmada por Felipe é o resultado desejado. As referências abaixo a PiP descrevem a implementação anterior, não o requisito vigente.

O gatilho entrega ao agente o `session_id` real, usado como `threadId`. `follow_progress` exige esse valor e a UI direta usa o input/resultado recebido, ignorando widgetState de outro chat; consulta o plano atual a cada dois segundos, sem seletor. Uma entrada lateral aberta manualmente recebe `{}` do aplicativo e permanece com seletor, consultando a cada cinco segundos. Nenhum modo presume que o chat mais recente é o chat visível. `view_progress(threadId)` apenas consulta dados; não abre a interface nem altera sua seleção. A renderização das etapas não depende de PiP nem de uma API de mudança de modo.

## Dados e permissões

O plugin guarda somente títulos, etapas, observações e resultados fornecidos pelo agente. Não lê e-mails, conversas ou arquivos de projetos por conta própria, nem percorre transcrições. O diretório de dados é `PLUGIN_DATA/plans` quando fornecido pelo host; caso contrário, usa `~/.local/share/larry-andamento/plans`. A variável `ANDAMENTO_DATA_DIR` permite isolar os testes. As operações são locais e não expõem uma porta de escrita.

Os gatilhos só adicionam contexto: não aprovam ferramentas, não alteram permissões e não bloqueiam o encerramento de um pedido.

## Verificação

```powershell
cd plugins/andamento
npm test
```

`npm run preview` serve uma prévia somente leitura em `http://127.0.0.1:5128`. Ela não comprova que o aplicativo já carregou o plugin. A validação visual dentro do host e a revisão dos gatilhos devem ser confirmadas separadamente.

## Referências

- [Extensões oficiais e painéis de conversa](https://developers.openai.com/plugins/build/extensions)
- [Empacotamento e marketplace local](https://developers.openai.com/plugins/build/plugins)
- [Gatilhos e revisão de confiança](https://learn.chatgpt.com/docs/hooks)
