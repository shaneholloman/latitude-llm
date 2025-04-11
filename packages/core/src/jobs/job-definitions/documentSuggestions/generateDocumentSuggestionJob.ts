import { env } from '@latitude-data/env'
import { Job } from 'bullmq'
import { unsafelyFindWorkspace } from '../../../data-access'
import {
  CommitsRepository,
  DocumentVersionsRepository,
  EvaluationsRepository,
  EvaluationsV2Repository,
} from '../../../repositories'
import { generateDocumentSuggestion } from '../../../services/documentSuggestions'
import { NotFoundError } from './../../../lib/errors'
import { UnprocessableEntityError } from './../../../lib/errors'

export type GenerateDocumentSuggestionJobData = {
  workspaceId: number
  commitId: number
  documentUuid: string
  evaluationUuid?: string
  evaluationId?: number
}

export function generateDocumentSuggestionJobKey({
  workspaceId,
  commitId,
  documentUuid,
  evaluationUuid,
  evaluationId,
}: GenerateDocumentSuggestionJobData) {
  return `generateDocumentSuggestionJob-${workspaceId}-${commitId}-${documentUuid}-${evaluationUuid}-${evaluationId}`
}

export const generateDocumentSuggestionJob = async (
  job: Job<GenerateDocumentSuggestionJobData>,
) => {
  if (!env.LATITUDE_CLOUD) return // Avoid spamming errors locally

  const { workspaceId, commitId, documentUuid, evaluationUuid, evaluationId } =
    job.data

  const workspace = await unsafelyFindWorkspace(workspaceId)
  if (!workspace) throw new NotFoundError(`Workspace not found ${workspaceId}`)

  const commitsRepository = new CommitsRepository(workspace.id)
  const commit = await commitsRepository
    .getCommitById(commitId)
    .then((r) => r.unwrap())

  const documentsRepository = new DocumentVersionsRepository(workspace.id)
  const document = await documentsRepository
    .getDocumentAtCommit({
      commitUuid: commit.uuid,
      documentUuid: documentUuid,
    })
    .then((r) => r.unwrap())

  let evaluation
  if (evaluationUuid) {
    const evaluationsRepository = new EvaluationsV2Repository(workspace.id)
    evaluation = await evaluationsRepository
      .getAtCommitByDocument({
        commitUuid: commit.uuid,
        documentUuid: document.documentUuid,
        evaluationUuid: evaluationUuid,
      })
      .then((r) => r.unwrap())
      .then((e) => ({ ...e, version: 'v2' as const }))
  } else {
    const evaluationsRepository = new EvaluationsRepository(workspace.id)
    evaluation = await evaluationsRepository
      .find(evaluationId)
      .then((r) => r.unwrap())
      .then((e) => ({ ...e, version: 'v1' as const }))
  }

  const result = await generateDocumentSuggestion({
    document: document,
    evaluation: evaluation,
    commit: commit,
    workspace: workspace,
  })

  if (result.error && !(result.error instanceof UnprocessableEntityError)) {
    result.unwrap()
  }
}
