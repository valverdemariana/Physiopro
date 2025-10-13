"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatBRDate } from "@/lib/utils";

type Sessao = { id: string; data: string; tipo: string; status?: string | null };

const PT_WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function WeekAgenda() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);

  useEffect(() => {
    const load = async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      const { data } = await supabase
        .from("sessoes")
        .select("id,data,tipo,status")
        .gte("data", start.toISOString())
        .lt("data", end.toISOString())
        .order("data", { ascending: true });

      setSessoes(data || []);
    };
    load();
  }, []);

  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Sessao[]>();
    days.forEach((d) => map.set(d.toISOString().slice(0, 10), []));
    sessoes.forEach((s) => {
      const key = new Date(s.data).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [sessoes, days]);

  const workHours = Array.from({ length: 10 }).map((_, i) => 8 + i); // 08..17

  return (
    <div className="card">
      <div className="font-semibold mb-3">Agenda da semana</div>
      <div className="space-y-2">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const list = byDay.get(key) || [];
          const booked = new Set(list.map((s) => new Date(s.data).getHours()));
          const free = workHours.filter((h) => !booked.has(h)).slice(0, 3); // mostra até 3 livres

          return (
            <div key={key} className="flex items-start justify-between border-b last:border-0 py-2">
              <div>
                <div className="font-medium">
                  {PT_WEEKDAYS[d.getDay()]} {formatBRDate(d.toISOString())}
                </div>
                <div className="small">
                  {list.length} consulta{list.length === 1 ? "" : "s"} ·{" "}
                  {free.length > 0
                    ? `vagas: ${free.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")}`
                    : "sem vagas"}
                </div>
              </div>
              <Link
                href={`/agenda?date=${key}`}
                className="text-uppli text-sm hover:underline"
              >
                Ver dia
              </Link>
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <Link href="/agenda" className="btn btn-secondary">Abrir agenda completa</Link>
      </div>
    </div>
  );
}
