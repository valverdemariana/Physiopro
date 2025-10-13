
# PhysioPro — MVP (Multiempresa)

Aplicativo web para gestão de fisioterapia com login, dashboard, pacientes, anamnese, agenda/sessões, exercícios, relatórios e perfil.
Design Uppli (limpo, moderno, azul #007AFF).

## Rodar localmente
1. **Pré-requisitos**: Node 18+ e npm.
2. Clone ou extraia este projeto.
3. Copie `.env.local.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. No Supabase, rode `supabase/schema.sql` no SQL Editor.
5. Instale dependências e rode:
```bash
npm install
npm run dev
```
6. Acesse `http://localhost:3000`.
7. Cadastre nova conta em `/register` (cria empresa + usuário admin).

## Deploy
- **Vercel** (recomendado): importe o repositório, configure as variáveis de ambiente iguais às do `.env.local`.
- **Render / Railway / Docker**: `npm run build` e `npm start`.

## Estrutura
- `app/` (Next.js App Router)
- `components/` (UI simples com Tailwind)
- `lib/` (Supabase client, utils)
- `supabase/` (schema + policies)

## Segurança / Multiempresa
- RLS (Row Level Security) ativo em todas as tabelas.
- Policies garantem que cada usuário veja apenas dados da própria empresa.
- Gatilhos preenchem `empresa_id` automaticamente.

## Observações
- Relatório PDF usa jsPDF no cliente.
- Gráfico de dor usa Recharts.
- Estilo com Tailwind (cores Uppli).
- Idioma e formatos pt-BR.
