"use client";
import { usePathname } from "next/navigation";
import NavbarBottom from "@/components/NavbarBottom";

export default function SafeNavbar() {
  const pathname = usePathname() || "";
  const isAuth =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/update-password");
  if (isAuth) return null;
  return <NavbarBottom />;
}
