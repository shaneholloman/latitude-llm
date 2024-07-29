import { database, Database } from '$core/client'
import { NotFoundError, Result, Transaction } from '$core/lib'
import { DocumentVersionsRepository } from '$core/repositories'
import { Commit } from '$core/schema'
import { destroyOrSoftDeleteDocuments } from '$core/services/documents/destroyOrSoftDeleteDocuments'
import { assertCommitIsDraft } from '$core/services/documents/utils'

export async function destroyFolder({
  path,
  commit,
  workspaceId,
  db = database,
}: {
  path: string
  commit: Commit
  workspaceId: number
  db?: Database
}) {
  return Transaction.call(async (tx) => {
    const assertResult = assertCommitIsDraft(commit)
    assertResult.unwrap()

    const docsScope = new DocumentVersionsRepository(workspaceId, tx)
    const allDocuments = (await docsScope.getDocumentsAtCommit(commit)).unwrap()

    const folderPath = path.endsWith('/') ? path : `${path}/`
    const documents = allDocuments.filter((d) => d.path.startsWith(folderPath))

    if (documents.length === 0) {
      return Result.error(new NotFoundError('Folder does not exist'))
    }

    return destroyOrSoftDeleteDocuments({
      documents,
      commit,
      trx: tx,
    })
  }, db)
}
