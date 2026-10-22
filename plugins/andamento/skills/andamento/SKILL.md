---
name: andamento
description: Acompanhar visualmente a execução de implementações, abertura ou encerramento de sessão e pedidos com várias ações no painel Andamento, atualizando etapas por conversa. Não usar para perguntas simples sem execução.
---

## Prioridade da conversa

Antes de consultar ou alterar o Andamento, interprete a mensagem mais recente de Felipe. Uma orientação, correção ou mudança de rumo explícita prevalece sobre qualquer plano e ação anterior. Se ela for incompatível com o trabalho em curso, pause imediatamente as ações incompatíveis; preserve apenas o trabalho que continue válido e atualize o plano para refletir a direção corrigida. O plano é registro de acompanhamento, nunca uma ordem para ignorar a instrução atual.

O plugin jamais bloqueia, rejeita, adia, dificulta ou exige confirmação para prompts, orientações ou ações do usuário. Não espere criar/atualizar um plano nem abrir o painel para reconhecer, responder ou executar a instrução. Hooks adicionam contexto; não reescrevem a mensagem do usuário. Se ferramentas ou painel estiverem indisponíveis, continue o trabalho normalmente e mencione apenas a limitação de acompanhamento quando relevante.

Use o identificador real da conversa informado pelo gatilho do plugin como threadId. Nunca invente um identificador de chat. Se o gatilho não estiver ativo, use o identificador real disponível no contexto do aplicativo; se nenhum existir, explique a limitação antes de criar um plano solto.

Depois de interpretar o pedido vigente, crie etapas concretas e sucintas com start_plan para tarefas com várias ações. Use o identificador do turno como requestId quando disponível. Em uma orientação que redirecione o trabalho em andamento, consulte get_progress e atualize o plano para representar a nova direção; não continue ações incompatíveis só porque constam do plano. Para um novo pedido independente, crie outro plano e preserve o histórico.

Ao criar um plano, estime o tempo ativo de cada etapa em minutos e envie `stepEstimatesMinutes` na mesma ordem das etapas. São estimativas aproximadas; não inclua períodos de espera externa. Se uma etapa não puder ser estimada com responsabilidade, omita a lista para que o painel não invente um tempo restante. Para etapa em execução, envie `progressPercent` de 0 a 99 ao iniciar e revise-o em marcos significativos; 100% fica reservado para conclusão verificada. É uma estimativa de conclusão da etapa, não uma medição de tempo. Etapas concluídas ou dispensadas contam como 100%; pendentes ou bloqueadas como 0%. O painel calcula o progresso total ponderando pela duração estimada e mostra o tempo ativo restante; bloqueios são apresentados como tempo após desbloqueio.

## Granularidade proporcional ao escopo

Não use 3 ou 4 etapas como formato padrão nem imponha um teto fixo. Dimensione o plano pelo escopo, número de entregáveis, dependências, riscos e verificações necessárias:

- Pedido pequeno e linear: normalmente 2–4 etapas.
- Pedido médio, com mais de um entregável ou validação independente: normalmente 4–7 etapas.
- Implementação grande, multifrente ou com integrações: use 8–12 ou mais etapas quando necessário. Não comprima descoberta, decisões, implementação, integração, testes, revisão de segurança/qualidade e publicação em poucos tópicos só para manter o plano curto.

Cada etapa deve ser um marco de trabalho distinto, com resultado verificável. Divida uma etapa quando ela esconder decisões, entregáveis ou gates de validação independentes; não crie uma etapa para cada comando, arquivo trivial ou chamada de ferramenta. Para trabalhos extensos, exponha as fases na ordem das dependências e deixe claro o que será considerado concluído em cada uma. O painel aceita listas maiores; priorize fidelidade ao trabalho real em vez de simetria ou brevidade artificial.

Mantenha o acompanhamento fora do fluxo do chat. Não publique checklist textual nem cartões inline. Ao iniciar o acompanhamento, use follow_progress com o threadId real para abrir diretamente o painel vinculado à conversa, sem seletor. Felipe aprovou a posição lateral já oferecida pelo Codex: preserve essa apresentação, sem exigir PiP, solicitar troca de modo ou criar janela externa. O valor técnico fullscreen não determina a geometria que Felipe vê. Abra uma vez, não em cada etapa. O painel já vinculado acompanha automaticamente os novos pedidos do mesmo chat. Se Felipe o fechar, só reabra quando ele pedir. open_panel permanece como acesso manual do aplicativo. view_progress é uma consulta de dados sem UI.

Marque in_progress antes de iniciar uma etapa. Após conferir o resultado, marque completed com uma nota curta que descreva a evidência. Em caso de impedimento, marque blocked com a causa. Use skipped apenas para etapas realmente não aplicáveis ou dispensadas por Felipe.

Atualize por marco significativo, sem criar uma etapa para cada chamada de ferramenta. Ao finalizar, releia o plano: etapas inacabadas permanecem pendentes ou bloqueadas. Não encerre o checklist artificialmente. O painel não substitui a execução, a verificação ou a resposta final.

O painel é por conversa. A abertura direta fica presa ao threadId recebido e atualiza a cada dois segundos; não assume o chat mais recente. A abertura manual pela barra lateral continua com seletor e consulta a cada cinco segundos. Consultar view_progress não altera a seleção de uma interface já aberta. Não bloquear a leitura de etapas por falta de uma API de mudança de modo. Não afirme que os testes de integração comprovam a posição ou o modo de exibição no host real. Se as ferramentas estiverem indisponíveis, informe a limitação sucintamente, sem checklist no chat.
