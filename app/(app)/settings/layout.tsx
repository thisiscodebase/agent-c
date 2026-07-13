"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

const TABS = [
  { href: "/settings", label: "Preferences", exact: true },
  { href: "/settings/integrations", label: "Integrations", exact: false },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <nav className="flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              href={tab.href}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
