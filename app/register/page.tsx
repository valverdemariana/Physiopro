"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          password: senha,     // ⬅️ envia senha pra criar o usuário no Auth
          empresaNome: empresa,
          cnpjCpf,
          telefone,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || "Falha no cadastro");
      setMsg("Conta criada com sucesso! Faça login.");
      setTimeout(() => (window.location.href = "/login"), 800);
    } catch (err: any) {
      setMsg(err.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page max-w-md">
      <h1 className="title text-center">Cadastre-se</h1>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <div className="label">Nome completo</div>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div>
          <div className="label">E-mail</div>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="label">Senha</div>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <div>
            <div className="label">Nome da empresa</div>
            <input className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
          </div>
          <div>
            <div className="label">CNPJ/CPF</div>
            <input className="input" value={cnpjCpf} onChange={(e) => setCnpjCpf(e.target.value)} required />
          </div>
          <div>
            <div className="label">Telefone</div>
            <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
        </div>

        {msg && <div className="small">{msg}</div>}

        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Criando..." : "Criar conta"}
        </button>
        <div className="text-center small">
          Já tem conta? <a className="text-uppli" href="/login">Entrar</a>
        </div>
      </form>
    </div>
  );
}
