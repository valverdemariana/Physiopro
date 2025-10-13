
# Supabase — Configuração

1) Crie um projeto no Supabase.
2) Em Authentication > Providers, mantenha Email habilitado.
3) Em SQL Editor, rode o conteúdo de `supabase/schema.sql` (copiar e colar).
4) Em Project Settings > API copie:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` -> `SUPABASE_SERVICE_ROLE_KEY` (use SOMENTE no servidor, já configurado no /api/register).
5) Em Table Editor, confirme as tabelas criadas. Nenhuma linha é pública: as Policies garantem multiempresa.

## Fluxo de cadastro
- O usuário cria conta (e-mail/senha) na tela `/register`.
- O backend `/api/register` cria a **empresa** e registra o usuário na tabela `usuarios` como **admin**.
- A partir daí, todos os inserts automáticos recebem `empresa_id` por gatilho.

## Observações
- As policies usam `auth.uid()` para buscar a `empresa_id` do usuário logado.
- Caso queira criar fisioterapeutas adicionais: insira em `usuarios` com o mesmo `empresa_id` do admin.
