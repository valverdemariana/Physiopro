import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// CORS básico
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

// máscara só para diagnóstico
function mask(s?: string) {
  if (!s) return "MISSING";
  return `${s.slice(0, 4)}…${s.slice(-4)} (len=${s.length})`;
}

// GET /api/register  -> diagnóstico das envs (remova depois)
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json(
    {
      ok: true,
      url,
      anon: mask(anon),
      service: mask(svc),
      sameProjectHint: !!(url && (anon || svc)),
    },
    { headers: corsHeaders }
  );
}

// OPTIONS para preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/register -> cria empresa + vincula usuário (como você já tinha)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "JSON inválido" }, { status: 400, headers: corsHeaders });
    }

    const {
      nome,
      email,
      empresaNome,
      cnpjCpf,
      telefone,
      password,
    }: {
      nome: string;
      email: string;
      empresaNome: string;
      cnpjCpf: string;
      telefone?: string;
      password?: string;
    } = body;

    if (!nome || !email || !empresaNome || !cnpjCpf) {
      return NextResponse.json(
        { message: "Campos obrigatórios: nome, email, empresaNome, cnpjCpf" },
        { status: 400, headers: corsHeaders }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !service) {
      return NextResponse.json(
        {
          message: "Configuração Supabase ausente.",
          debug: { url: !!url, service: !!service },
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) garantir/obter usuário
    let userId: string | null = null;

    if (password) {
      const { data: created, error: eCreate } = await admin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
      });

      if (!eCreate && created?.user) {
        userId = created.user.id;
      } else if (eCreate?.status === 422) {
        const { data: lu, error: eList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (eList) return NextResponse.json({ message: eList.message }, { status: 500, headers: corsHeaders });
        userId = lu.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
      } else if (eCreate) {
        return NextResponse.json({ message: eCreate.message }, { status: 400, headers: corsHeaders });
      }
    } else {
      const { data: lu, error: eList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (eList) return NextResponse.json({ message: eList.message }, { status: 500, headers: corsHeaders });
      userId = lu.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json(
        { message: "Usuário não encontrado. Informe 'password' para criar um novo." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2) cria empresa
    const { data: empresa, error: eEmp } = await admin
      .from("empresas")
      .insert({ nome: empresaNome, cnpj: cnpjCpf, telefone, email })
      .select("id")
      .single();

    if (eEmp || !empresa) {
      return NextResponse.json({ message: eEmp?.message || "Falha ao criar empresa" }, { status: 400, headers: corsHeaders });
    }

    // 3) upsert usuário na tabela usuarios
    const { error: eUser } = await admin
      .from("usuarios")
      .upsert(
        { id: userId, nome, email, empresa_id: empresa.id, cargo: "admin" },
        { onConflict: "id" }
      );

    if (eUser) {
      return NextResponse.json({ message: eUser.message }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Erro inesperado" }, { status: 500, headers: corsHeaders });
  }
}
