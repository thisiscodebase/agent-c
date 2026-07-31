import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getArtifactForUser } from "~~/server/utils/artifacts";
import { requireSessionUserId } from "~~/server/utils/session";
import { ArtifactView } from "~/components/artifacts/artifact-view";

export default async function ArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, userId] = await Promise.all([
    params,
    requireSessionUserId(await headers()),
  ]);

  const artifact = await getArtifactForUser(userId, id);
  if (!artifact) {
    notFound();
  }

  return (
    <ArtifactView artifact={artifact} />
  );
}
