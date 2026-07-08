import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~~/auth";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  return children;
}
