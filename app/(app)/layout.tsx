import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~~/auth";
import { AppShell } from "~/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
