import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // precisa de process.env

type Item = { categoria: string; nome: string; nivel: "basico" | "intermediario" | "avancado" };

const CATALOGO_GLOBAL: Item[] = [
  // 🧘 Solo / Mat (básico)
  { categoria: "Solo", nome: "Hundred", nivel: "basico" },
  { categoria: "Solo", nome: "Roll Up", nivel: "basico" },
  { categoria: "Solo", nome: "Single Leg Circles", nivel: "basico" },
  { categoria: "Solo", nome: "Rolling Like a Ball", nivel: "basico" },
  { categoria: "Solo", nome: "Single Leg Stretch", nivel: "basico" },
  { categoria: "Solo", nome: "Double Leg Stretch", nivel: "basico" },
  { categoria: "Solo", nome: "Spine Stretch Forward", nivel: "basico" },
  { categoria: "Solo", nome: "Open Leg Rocker (apoio)", nivel: "basico" },
  { categoria: "Solo", nome: "Corkscrew (inicial)", nivel: "basico" },
  { categoria: "Solo", nome: "Saw", nivel: "basico" },
  { categoria: "Solo", nome: "Swan Prep", nivel: "basico" },
  { categoria: "Solo", nome: "Single Leg Kick", nivel: "basico" },
  { categoria: "Solo", nome: "Double Leg Kick", nivel: "basico" },
  { categoria: "Solo", nome: "Neck Pull (facilitado)", nivel: "basico" },
  { categoria: "Solo", nome: "Shoulder Bridge", nivel: "basico" },
  { categoria: "Solo", nome: "Side Kick Series", nivel: "basico" },
  { categoria: "Solo", nome: "Teaser (com apoio)", nivel: "basico" },
  { categoria: "Solo", nome: "Seal (básico)", nivel: "basico" },

  // 🛠 Reformer (básico)
  { categoria: "Reformer", nome: "Footwork Series (Toes / Arches / Heels / Tendon Stretch)", nivel: "basico" },
  { categoria: "Reformer", nome: "Hundred", nivel: "basico" },
  { categoria: "Reformer", nome: "Leg Circles / Frogs", nivel: "basico" },
  { categoria: "Reformer", nome: "Stomach Massage Series (Round / Hands Back / Reach)", nivel: "basico" },
  { categoria: "Reformer", nome: "Short Box Series (Round / Flat / Side to Side)", nivel: "basico" },
  { categoria: "Reformer", nome: "Elephant", nivel: "basico" },
  { categoria: "Reformer", nome: "Knee Stretches (Round / Arched)", nivel: "basico" },
  { categoria: "Reformer", nome: "Running", nivel: "basico" },
  { categoria: "Reformer", nome: "Pelvic Lift", nivel: "basico" },

  // 🪵 Cadillac (básico)
  { categoria: "Cadillac", nome: "Breathing", nivel: "basico" },
  { categoria: "Cadillac", nome: "Roll Back", nivel: "basico" },
  { categoria: "Cadillac", nome: "Leg Springs Series (Supine)", nivel: "basico" },
  { categoria: "Cadillac", nome: "Arm Springs Series (Supine)", nivel: "basico" },
  { categoria: "Cadillac", nome: "Monkey", nivel: "basico" },
  { categoria: "Cadillac", nome: "Push Through (deitado/sentado)", nivel: "basico" },
  { categoria: "Cadillac", nome: "Tower Prep", nivel: "basico" },
  { categoria: "Cadillac", nome: "Teaser Prep", nivel: "basico" },

  // 🪜 Wunda Chair (básico)
  { categoria: "Wunda Chair", nome: "Footwork on Chair", nivel: "basico" },
  { categoria: "Wunda Chair", nome: "Pumping One and Two Legs", nivel: "basico" },
  { categoria: "Wunda Chair", nome: "Spine Stretch Forward", nivel: "basico" },
  { categoria: "Wunda Chair", nome: "Swan", nivel: "basico" },
  { categoria: "Wunda Chair", nome: "Mermaid", nivel: "basico" },
  { categoria: "Wunda Chair", nome: "Push Down Series", nivel: "basico" },
  { categoria: "Wunda Chair", nome: "Pull Up Prep", nivel: "basico" },

  // ⚖ Barrel (básico)
  { categoria: "Barrel", nome: "Swan", nivel: "basico" },
  { categoria: "Barrel", nome: "Leg Series (Side Leg Lift / Side Kick)", nivel: "basico" },
  { categoria: "Barrel", nome: "Short Box Series adaptada", nivel: "basico" },
  { categoria: "Barrel", nome: "Back Extension", nivel: "basico" },
  { categoria: "Barrel", nome: "Hamstring Stretch", nivel: "basico" },
];

export async function POST(_req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !service) {
    return NextResponse.json({ message: "Supabase env ausente" }, { status: 500 });
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  // Já existe catálogo global?
  const { count, error: countErr } = await admin
    .from("exercicios")
    .select("*", { head: true, count: "exact" })
    .is("empresa_id", null);

  if (countErr) {
    return NextResponse.json({ message: countErr.message }, { status: 400 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: true, message: "Catálogo global já existente" });
  }

  // Insere global (empresa_id = NULL). Usa upsert para evitar duplicados se rodar 2x.
  const payload = CATALOGO_GLOBAL.map((i) => ({
    empresa_id: null,
    categoria: i.categoria,
    nome: i.nome,
    nivel: i.nivel,
  }));

  const { error } = await admin
    .from("exercicios")
    .upsert(payload, { onConflict: "empresa_id,categoria,nome", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, inserted: payload.length });
}
