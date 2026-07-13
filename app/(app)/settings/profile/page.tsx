import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { profilePathForEmail } from "#shared/user-handle";
import { auth } from "~~/auth";

export default async function SettingsProfileRedirectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const href = profilePathForEmail(session?.user?.email) ?? "/settings";
  redirect(href);
}
