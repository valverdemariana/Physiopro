"use client";
import { useState } from "react";

// pequenas helpers para evitar erros bobos
const onlyDigits = (v: string) => v.replace(/\D+/g, "");
const trimAll = (v: string) => v.trim();

export default function RegisterPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setMsg(null);

    // validações simples no cliente para evitar 400 desnecessário
    const _nome = trimAll(nome);
    const _email = trimAll(email).toLowerCase();
    const _senha = senha; // manter como está, só checar tamanho
    const _empresa = trimAll(empresa);
    const _cnpjCpf = onlyDigits(cnpjCpf);
    const _telefone = onlyDigits(telefone);

    if (!_nome || !_email || !_empresa || !_cnpjCpf) {
      setMsg({ ok: false, text: "Preencha nome, e-mail, empresa e CNPJ/CPF." });
      return;
    }
    if (_senha.length < 6) {
      setMsg({ ok: false, text: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nome: _nome,
          email: _email,
          password: _senha,        // <- envia senha (o route.ts cria o usuário)
          empresaNome: _empresa,
          cnpjCpf: _cnpjCpf,
          telefone: _telefone || undefined,
        }),
      });

      // algumas vezes o servidor pode responder texto simples; garantimos parse
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      if (!res.ok) {
        setMsg({
          ok: false,
          text:
            data?.message ||
            (res.status === 500
              ? "Erro no servidor. Tente novamente em instantes."
              : "Falha no cadastro."),
        });
        return;
      }

      setMsg({ ok: true, text: "Conta criada com sucesso! Redirecionando..." });
      // pequena espera para o usuário ver a mensagem
      setTimeout(() => (window.location.href = "/login"), 900);
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "Erro de rede ao cadastrar." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page max-w-md">
      <h1 className="title text-center">Cadastre-se</h1>

      <form onSubmit={submit} className="card space-y-3">
        <div>
          <div className="label">Nome completo</div>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div>
          <div className="label">E-mail</div>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="label">Senha</div>
          <input
            className="input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            placeholder="mín. 6 caracteres"
            required
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <div>
            <div className="label">Nome da empresa</div>
            <input
              className="input"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="label">CNPJ/CPF</div>
            <input
              className="input"
              value={cnpjCpf}
              onChange={(e) => setCnpjCpf(e.target.value)}
              inputMode="numeric"
              placeholder="somente números"
              required
            />
          </div>

          <div>
            <div className="label">Telefone</div>
            <input
              className="input"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              inputMode="tel"
              placeholder="(opcional)"
            />
          </div>
        </div>

        {msg && (
          <div className={`small ${msg.ok ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </div>
        )}

        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div className="text-center small">
          Já tem conta?{" "}
          <a className="text-uppli" href="/login">
            Entrar
          </a>
        </div>
      </form>
    </div>
  );
}
