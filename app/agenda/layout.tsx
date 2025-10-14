export const dynamic = "force-dynamic";
export const revalidate = 0;               // número
export const fetchCache = "force-no-store";

export default function AgendaLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
