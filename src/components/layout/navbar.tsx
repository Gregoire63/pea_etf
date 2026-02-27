"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, GitCompareArrows, Wallet } from "lucide-react";

const links = [
  { href: "/",          label: "Classement", mobileLabel: "ETF",       icon: BarChart3 },
  { href: "/compare",   label: "Comparer",   mobileLabel: "Comparer",  icon: GitCompareArrows },
  { href: "/portfolio", label: "Portfolio",  mobileLabel: "Portfolio", icon: Wallet },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Barre du haut — masquée sur mobile ──────────────────────────────── */}
      <header className="hidden sm:sticky sm:top-0 sm:z-50 sm:block sm:border-b sm:bg-background/95 sm:backdrop-blur sm:supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
          <Link href="/" className="mr-8 flex items-center gap-2 font-bold">
            <Image
              src="/logo.png"
              alt="PEA ETF logo"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="hidden sm:inline">PEA - ETF</span>
          </Link>

          {/* Navigation desktop — masquée sur mobile (remplacée par la barre basse) */}
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Navigation mobile en bas ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden">
        <div className="flex h-16 items-center justify-around">
          {links.map(({ href, mobileLabel, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                {mobileLabel}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
