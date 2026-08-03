import { headers } from "next/headers";
import { listArtifactsForUser } from "~~/server/utils/artifacts";
import { requireSessionUserId } from "~~/server/utils/session";
import { ArtifactBrowser } from "~/components/artifacts/artifact-browser";

export default async function ArtifactsPage() {
  const userId = await requireSessionUserId(await headers());
  const artifacts = await listArtifactsForUser(userId);

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3 p-4">
      <div>
        <h1 className="font-heading text-lg font-medium">Docs</h1>
        <p className="text-sm text-muted-foreground">
          Recent opens, everything you’ve written, and a browse-by-kind filing cabinet.
        </p>
      </div>

      <ArtifactBrowser artifacts={artifacts} />
    </div>
  );
}
