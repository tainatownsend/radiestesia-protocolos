# Base privada do Sintonizze

Status: implementada e testada localmente; não ativada no preview e não aplicada a qualquer banco remoto. Aceite do fluxo v4.2.6 recebido do usuário em 28/09/2026 UTC. O teste físico permanece evidência do usuário, não uma execução automatizada.

## Decisão de implementação

Primeiro passo: snapshots explícitos do documento completo v4.2, preservando IDs locais, vínculos, campos desconhecidos, respostas omitidas, leituras zero e histórico. Cada salvamento acrescenta uma revisão; nenhuma revisão anterior é atualizada ou apagada pelo cliente. Uma revisão desatualizada retorna conflito, sem mesclagem automática. A chave `(owner_id, revision)` impede dois salvamentos da mesma revisão.

Este é um mecanismo de persistência inicial, não sincronização automática/offline ou modelo relacional definitivo. Não chamar a cada tecla: snapshots completos têm custo crescente. Limite por documento: 2 MiB em representação JSONB textual. Antes de uso prolongado, definir retenção e evoluir entidades/consultas sem perder os snapshots originais. Anexos binários ainda não estão cobertos.

## Acesso

- RLS por proprietário, com cadastro adicional em `sintonizze_members`, administrado somente por infraestrutura confiável. Uma conta autenticada sem associação não lê nem grava documentos.
- Sem privilégios de update/delete para o cliente; sem service-role no navegador.
- O adaptador `client.mjs` recebe uma instância de Supabase JS. Ele não cria conexões nem lê/envia localStorage sozinho.
- Login por OTP usa `shouldCreateUser: false`; configurar o template com `{{ .Token }}` e desativar cadastro público no projeto. Provisionar o usuário e a associação antes de liberar acesso. Nenhum e-mail foi enviado nesta implementação.
- Expor no frontend apenas URL e chave publicável; carregar documentos somente após validar a conta. Ao trocar/sair da conta, descartar estado em memória e manter cache local separado por ID, nunca reutilizar automaticamente o localStorage legado.

## Ativação, em ordem

1. Confirmar organização, região e custo para um projeto dedicado. A conta conectada tem organização **Vereda** e dois projetos do Vereda; nenhum foi modificado.
2. Criar/selecionar o projeto Sintonizze e aplicar a migração versionada em `../supabase/migrations/`.
3. Desativar novos cadastros, configurar OTP e cadastrar o usuário aprovado em Auth e em `sintonizze_members`. Definir SMTP para entrega fora das restrições do serviço de testes.
4. Integrar tela de acesso e estados carregando/salvando/offline/conflito ao HTML, utilizando cliente Supabase com versão fixa. Não ativar salvamento até a primeira leitura remota terminar.
5. Na primeira migração, exportar backup local e pedir escolha explícita para importar. Se a nuvem já contém dados, não substituir automaticamente. Revisão zero significa criação, nunca autorização para sobrescrever.
6. Repetir testes com duas contas reais de QA, sessão expirada, dois dispositivos, perda de conexão, restauração e logout. Testar antes de liberar dados reais e antes de promover produção.

## Verificação executada

`npm test` no diretório pai: **8 testes passaram**, incluindo os 6 testes do fluxo aprovado e 2 novos testes. A migração foi executada em PostgreSQL embarcado (PGlite 0.5.8) com roles/subject que simulam o ambiente Supabase: isolamento de duas contas, bloqueio de anônimo e não associado, proibição de autoassociação, histórico imutável, revisões antigas recusadas, documentos inválidos/grandes recusados e preservação integral do documento. O adaptador também verifica erro de rede e conflito sem alterar o documento original.

Limites: PGlite não valida entrega de e-mail, PostgREST remoto ou concorrência entre conexões reais. Esses testes permanecem na etapa 6. Nenhuma chamada remota de salvamento foi executada.

Referências consultadas: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [OTP por e-mail](https://supabase.com/docs/guides/auth/auth-email-passwordless).
