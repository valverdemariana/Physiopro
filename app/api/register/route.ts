
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>null);
  if (!body) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const { nome, email, empresaNome, cnpjCpf, telefone } = body as {
    nome: string; email: string; empresaNome: string; cnpjCpf: string; telefone?: string;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) {
    return NextResponse.json({ message: "Configuração Supabase ausente." }, { status: 500 });
  }

  const supabase = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  // Get current user (from cookie header Authorization is not present here, so we rely on auth context)
  // For MVP, we will find the auth user by email
  const { data: users, error: uerr } = await supabase.auth.admin.listUsers();
  if (uerr) return NextResponse.json({ message: uerr.message }, { status: 500 });
  const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return NextResponse.json({ message: "Usuário não encontrado após signup." }, { status: 400 });

  // Create empresa
  const { data: empresa, error: eerr } = await supabase
    .from("empresas")
    .insert({ nome: empresaNome, cnpj: cnpjCpf, telefone, email })
    .select()
    .single();

  if (eerr || !empresa) return NextResponse.json({ message: eerr?.message || "Falha ao criar empresa" }, { status: 500 });

  // Create usuario (admin)
  const { error: uinsErr } = await supabase
    .from("usuarios")
    .insert({ id: user.id, nome, email, empresa_id: empresa.id, cargo: "admin" });

  if (uinsErr) return NextResponse.json({ message: uinsErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
