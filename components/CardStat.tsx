import Link from "next/link";
import { ReactNode } from "react";

export default function CardStat({
  title,
  subtitle,
  right,
  href,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="card flex items-center justify-between hover:shadow-md transition">
      <div>
        {subtitle && <div className="text-textsec text-sm">{subtitle}</div>}
        <div className="text-2xl font-bold">{title}</div>
      </div>
      {right}
    </div>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}
