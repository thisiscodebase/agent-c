import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "~~/server/db/client";
import type {
  Artifact,
  ArtifactColour,
  ArtifactStatus,
  ArtifactSummary,
  ArtifactType,
} from "#shared/types/artifact";
import {
  artifactColourForId,
  stripLeadingTitleHeading,
  truncateArtifactTitle,
} from "#shared/types/artifact";
import { extractLeadingArtifactVisual } from "#shared/types/artifact-chart";
import { createError } from "~~/server/utils/http-error";

const LIST_LIMIT = 50;

type ArtifactRow = typeof schema.artifacts.$inferSelect;

function rowToSummary(row: ArtifactRow): ArtifactSummary {
  const body = stripLeadingTitleHeading(row.contentMarkdown, row.title);
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    status: row.status,
    colour: row.colour,
    size: new TextEncoder().encode(row.contentMarkdown).length,
    leadingVisual: extractLeadingArtifactVisual(body),
    metadata: row.metadata ?? {},
    threadId: row.threadId ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function rowToArtifact(row: ArtifactRow, authorName: string): Artifact {
  return {
    ...rowToSummary(row),
    contentMarkdown: row.contentMarkdown,
    authorName,
  };
}

export async function listArtifactsForUser(userId: string): Promise<ArtifactSummary[]> {
  const rows = await db.select()
    .from(schema.artifacts)
    .where(eq(schema.artifacts.authorId, userId))
    .orderBy(desc(schema.artifacts.updatedAt))
    .limit(LIST_LIMIT);

  return rows.map(rowToSummary);
}

export async function getArtifactForUser(userId: string, id: string) {
  const [row] = await db.select({
    artifact: schema.artifacts,
    authorName: schema.user.name,
  })
    .from(schema.artifacts)
    .innerJoin(schema.user, eq(schema.artifacts.authorId, schema.user.id))
    .where(and(
      eq(schema.artifacts.id, id),
      eq(schema.artifacts.authorId, userId),
    ))
    .limit(1);

  return row ? rowToArtifact(row.artifact, row.authorName) : undefined;
}

export async function createArtifactForUser(
  userId: string,
  input: {
    type: ArtifactType;
    title: string;
    contentMarkdown: string;
    colour?: ArtifactColour;
    metadata?: Record<string, unknown>;
    threadId?: string;
  },
): Promise<Artifact> {
  const contentMarkdown = input.contentMarkdown.trim();
  if (!contentMarkdown) {
    throw createError({
      statusCode: 400,
      statusMessage: "Artifact content cannot be empty",
    });
  }

  const id = crypto.randomUUID();

  await db.insert(schema.artifacts).values({
    id,
    authorId: userId,
    threadId: input.threadId,
    type: input.type,
    title: truncateArtifactTitle(input.title),
    contentMarkdown,
    colour: input.colour ?? artifactColourForId(id),
    metadata: input.metadata ?? {},
  });

  const created = await getArtifactForUser(userId, id);
  if (!created) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create artifact",
    });
  }

  return created;
}

export async function updateArtifactForUser(
  userId: string,
  id: string,
  patch: {
    title?: string;
    contentMarkdown?: string;
    status?: ArtifactStatus;
    colour?: ArtifactColour;
    metadata?: Record<string, unknown>;
  },
) {
  const existing = await getArtifactForUser(userId, id);
  if (!existing) {
    return undefined;
  }

  await db.update(schema.artifacts)
    .set({
      updatedAt: new Date(),
      ...(patch.title !== undefined ? { title: truncateArtifactTitle(patch.title) } : {}),
      ...(patch.contentMarkdown !== undefined
        ? { contentMarkdown: patch.contentMarkdown.trim() }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.colour !== undefined ? { colour: patch.colour } : {}),
      ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
    })
    .where(and(
      eq(schema.artifacts.id, id),
      eq(schema.artifacts.authorId, userId),
    ));

  return getArtifactForUser(userId, id);
}

export async function deleteArtifactForUser(userId: string, id: string) {
  const existing = await getArtifactForUser(userId, id);
  if (!existing) {
    return false;
  }

  await db.delete(schema.artifacts)
    .where(and(
      eq(schema.artifacts.id, id),
      eq(schema.artifacts.authorId, userId),
    ));

  return true;
}
