import { and, eq } from 'drizzle-orm'
import { Commit, DocumentVersion, Workspace } from '../../browser'
import { database } from '../../client'
import {
  ConflictError,
  LatitudeError,
  Result,
  Transaction,
  TypedResult,
} from '../../lib'
import { documentVersions } from '../../schema'
import { omit } from 'lodash-es'
import { DocumentVersionsRepository } from '../../repositories'

export async function resetToDocumentVersion(
  {
    workspace,
    documentVersion,
    draft,
  }: {
    workspace: Workspace
    documentVersion: DocumentVersion
    draft: Commit
  },
  db = database,
): Promise<TypedResult<DocumentVersion, Error>> {
  const docRepo = new DocumentVersionsRepository(workspace!.id, db)
  const documentsInDraft = await docRepo.getDocumentsAtCommit(draft)
  if (documentsInDraft.error) return Result.error(documentsInDraft.error)

  if (
    documentsInDraft.value.some(
      (d) =>
        d.path === documentVersion.path &&
        d.documentUuid !== documentVersion.documentUuid,
    )
  ) {
    return Result.error(
      new ConflictError(
        'Document with the same path already exists in the draft',
      ),
    )
  }

  return await Transaction.call(async (tx) => {
    await tx
      .delete(documentVersions)
      .where(
        and(
          eq(documentVersions.commitId, draft.id),
          eq(documentVersions.documentUuid, documentVersion.documentUuid),
        ),
      )

    const insertedDocument = await tx
      .insert(documentVersions)
      .values({
        ...omit(documentVersion, ['id', 'commitId', 'updatedAt', 'createdAt']),
        commitId: draft.id,
      })
      .returning()

    if (insertedDocument.length === 0) {
      return Result.error(new LatitudeError('Could not reset to version'))
    }

    // Invalidate all resolvedContent for this commit
    await tx
      .update(documentVersions)
      .set({ resolvedContent: null })
      .where(eq(documentVersions.commitId, draft.id))

    return Result.ok(insertedDocument[0]!)
  }, db)
}