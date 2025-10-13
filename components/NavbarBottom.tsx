
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, User } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Início", Icon: Home },
  { href: "/pacientes", label: "Pacientes", Icon: Users },
  { href: "/agenda", label: "Agenda", Icon: CalendarDays },
  { href: "/perfil", label: "Perfil", Icon: User },
];

export default function NavbarBottom() {
  const pathname = usePathname();
  return (
    <nav className="navbar-bottom">
      <div className="mx-auto max-w-3xl grid grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center py-2 ${active ? "text-uppli" : "text-textsec"}`}
            >
              <Icon size={22} />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
