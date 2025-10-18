import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// helpers
function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type, authorization");
  return res;
}

export async function OPTIONS() {
  return withCORS(json({ ok: true }));
}

export async function POST(req: NextRequest) {
  try {
    // 0) envs
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) {
      const missing = [
        !url && "NEXT_PUBLIC_SUPABASE_URL",
        !service && "SUPABASE_SERVICE_ROLE_KEY",
      ].filter(Boolean);
      return withCORS(json({ message: `Variáveis ausentes: ${missing.join(", ")}` }, 500));
    }

    // 1) body
    const body = await req.json().catch(() => null);
    if (!body) return withCORS(json({ message: "JSON inválido" }, 400));

    const {
      nome,
      email,
      empresaNome,
      cnpjCpf,
      telefone,
      password, // opcional; se vier, cria o usuário
    }: {
      nome: string;
      email: string;
      empresaNome: string;
      cnpjCpf: string;
      telefone?: string;
      password?: string;
    } = body;

    if (!nome || !email || !empresaNome || !cnpjCpf) {
      return withCORS(
        json({ message: "Campos obrigatórios: nome, email, empresaNome, cnpjCpf" }, 400)
      );
    }

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2) garantir/obter usuário
    let userId: string | null = null;

    if (password) {
      const { data: created, error: eCreate } = await admin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
      });

      if (eCreate) {
        if (/invalid api key/i.test(eCreate.message)) {
          return withCORS(
            json({ message: "Invalid API key (service role). Verifique as variáveis do Vercel." }, 500)
          );
        }
        // já existe → procurar por e-mail
        if (eCreate.status === 422 || /already/i.test(eCreate.message)) {
          const { data: lu, error: eList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
          if (eList) return withCORS(json({ message: eList.message }, 500));
          userId = lu.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
        } else {
          return withCORS(json({ message: eCreate.message }, 400));
        }
      } else {
        userId = created?.user?.id ?? null;
      }
    } else {
      // sem senha: assume usuário já existente
      const { data: lu, error: eList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (eList) return withCORS(json({ message: eList.message }, 500));
      userId = lu.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    }

    if (!userId) {
      return withCORS(
        json({ message: "Usuário não encontrado/criado. Informe 'password' para novo cadastro." }, 400)
      );
    }

    // 3) cria empresa (se já existir, reutiliza)
    const { data: empresa, error: eEmp } = await admin
      .from("empresas")
      .insert({ nome: empresaNome, cnpj: cnpjCpf, telefone, email })
      .select("id")
      .single();

    let empresaId = empresa?.id as string | undefined;

    if (eEmp) {
      if (/duplicate key/i.test(eEmp.message) || /unique/i.test(eEmp.message)) {
        const { data: ex, error: eFind } = await admin
          .from("empresas")
          .select("id")
          .eq("cnpj", cnpjCpf)
          .single();
        if (eFind || !ex) return withCORS(json({ message: eEmp.message }, 400));
        empresaId = ex.id;
      } else {
        return withCORS(json({ message: eEmp.message }, 400));
      }
    }

    // 4) vincula/atualiza usuário como admin
    const { error: eUser } = await admin
      .from("usuarios")
      .upsert(
        { id: userId, nome, email, empresa_id: empresaId!, cargo: "admin" },
        { onConflict: "id" }
      );

    if (eUser) return withCORS(json({ message: eUser.message }, 400));

    return withCORS(json({ ok: true }));
  } catch (err: any) {
    return withCORS(json({ message: err?.message || "Erro inesperado" }, 500));
  }
}
