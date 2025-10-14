import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // garante Node (não Edge)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "JSON inválido" }, { status: 400 });
    }

    const {
      nome,
      email,
      empresaNome,
      cnpjCpf,
      telefone,
      password, // ⬅️ opcional; se vier, cria o usuário no Auth
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
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !service) {
      return NextResponse.json({ message: "Configuração Supabase ausente." }, { status: 500 });
    }

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) garantir/obter o usuário no Auth
    let userId: string | null = null;

    if (password) {
      // tenta criar; se já existir, caímos pro listUsers
      const { data: created, error: eCreate } = await admin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
      });

      if (!eCreate && created?.user) {
        userId = created.user.id;
      } else if (eCreate?.status === 422) {
        // "User already registered" → busca por e-mail
        const { data: lu, error: eList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (eList) return NextResponse.json({ message: eList.message }, { status: 500 });
        userId = lu.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
      } else if (eCreate) {
        return NextResponse.json({ message: eCreate.message }, { status: 400 });
      }
    } else {
      // sem senha: supõe usuário já existente e busca por e-mail
      const { data: lu, error: eList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (eList) return NextResponse.json({ message: eList.message }, { status: 500 });
      userId = lu.users.find(u => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json(
        { message: "Usuário não encontrado. Informe 'password' para criar um novo." },
        { status: 400 }
      );
    }

    // 2) cria empresa
    const { data: empresa, error: eEmp } = await admin
      .from("empresas")
      .insert({ nome: empresaNome, cnpj: cnpjCpf, telefone, email })
      .select("id")
      .single();

    if (eEmp || !empresa) {
      return NextResponse.json({ message: eEmp?.message || "Falha ao criar empresa" }, { status: 400 });
    }

    // 3) vincula/atualiza usuário como admin na empresa
    const { error: eUser } = await admin
      .from("usuarios")
      .upsert(
        { id: userId, nome, email, empresa_id: empresa.id, cargo: "admin" },
        { onConflict: "id" }
      );

    if (eUser) {
      return NextResponse.json({ message: eUser.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Erro inesperado" }, { status: 500 });
  }
}
