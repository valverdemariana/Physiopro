// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

// ESTE ARQUIVO SÓ É IMPORTADO EM ROTAS/API OU SERVER ACTIONS
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // mesma URL
  process.env.SUPABASE_SERVICE_ROLE_KEY!      // 🔒 server key (sem NEXT_PUBLIC)
);
