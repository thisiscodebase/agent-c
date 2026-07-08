"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/integrations", label: "Integrations" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <nav className="flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium",
              pathname === tab.href ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            href={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
