
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  // form
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [telefone, setTelefone] = useState("");

  // ui
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);

    // 1) cria conta no Supabase
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password: senha,
    });
    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }

    // 2) cria empresa e o usuário admin na nossa base (usa service_role no /api)
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, empresaNome, cnpjCpf, telefone }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setLoading(false);
      setError(j.message || "Falha ao salvar dados da empresa/usuário.");
      return;
    }

    setLoading(false);

    // 3) redireciona conforme confirmação de e-mail
    if (data.session) {
      // se a confirmação de e-mail estiver desativada, já entra logado
      router.push("/dashboard");
    } else {
      // confirmação ativada → pede para verificar o e-mail
      setMsg("Conta criada! Verifique seu e-mail para confirmar e depois faça login.");
      setTimeout(() => router.push("/login"), 1400);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* topo (logo + marca) */}
      <div className="mt-8 mb-6 flex items-center gap-3">
        <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="14" y="4" width="36" height="56" rx="10" fill="#0A84FF" opacity="0.9" />
          <rect x="4" y="14" width="56" height="36" rx="10" fill="#007AFF" />
        </svg>
        <div className="text-3xl font-extrabold tracking-tight" style={{ color: "#1C1C1E" }}>
          PhysioPro
        </div>
      </div>

      <p className="text-center text-textsec mb-6 max-w-xs">
        Crie sua conta e sua clínica (empresa) para começar.
      </p>

      {/* card do formulário */}
      <form onSubmit={onSubmit} className="w-full max-w-md card space-y-3">
        {error && <div className="small text-red-600">{error}</div>}
        {msg && <div className="small text-green-600">{msg}</div>}

        <div className="grid md:grid-cols-2 gap-3">
          <input
            className="input h-12"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <input
            className="input h-12"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <input
          className="input h-12"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        <div className="grid md:grid-cols-2 gap-3">
          <input
            className="input h-12"
            placeholder="Nome da empresa"
            value={empresaNome}
            onChange={(e) => setEmpresaNome(e.target.value)}
            required
          />
          <input
            className="input h-12"
            placeholder="CNPJ ou CPF (obrigatório)"
            value={cnpjCpf}
            onChange={(e) => setCnpjCpf(e.target.value)}
            required
          />
        </div>

        <input
          className="input h-12"
          placeholder="Telefone (opcional)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <button className="btn btn-primary w-full h-12 text-lg" disabled={loading}>
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div className="text-center small">
          Já tem conta?{" "}
          <Link href="/login" className="text-uppli hover:underline">
            Entrar
          </Link>
        </div>
      </form>

      <div className="mt-8 small text-textsec">Versão 1.0 – PhysioPro Health Systems</div>
    </div>
  );
}
