import { cache } from 'react'

import {
  Commit,
  CommitsRepository,
  DocumentVersionsRepository,
  NotFoundError,
  Project,
  ProjectsRepository,
} from '@latitude-data/core'
import { getCurrentUser } from '$/services/auth/getCurrentUser'
import { notFound } from 'next/navigation'

export const getFirstProject = cache(
  async ({ workspaceId }: { workspaceId: number }) => {
    const projectsScope = new ProjectsRepository(workspaceId)
    const result = await projectsScope.getFirstProject()
    const project = result.unwrap()

    return project
  },
)

export const findProject = cache(
  async ({
    projectId,
    workspaceId,
  }: {
    projectId: number
    workspaceId: number
  }) => {
    const projectsScope = new ProjectsRepository(workspaceId)
    const result = await projectsScope.getProjectById(projectId)
    const project = result.unwrap()

    return project
  },
)

export const findCommit = cache(
  async ({ uuid, project }: { uuid: string; project: Project }) => {
    const commitsScope = new CommitsRepository(project.workspaceId)
    const result = await commitsScope.getCommitByUuid({ project, uuid })
    const commit = result.unwrap()

    return commit
  },
)

export const getDocumentByUuid = cache(
  async ({
    documentUuid,
    commit,
  }: {
    documentUuid: string
    commit: Commit
  }) => {
    const { workspace } = await getCurrentUser()
    const scope = new DocumentVersionsRepository(workspace.id)
    const result = await scope.getDocumentAtCommit({ documentUuid, commit })
    if (result.error) {
      const error = result.error
      if (error instanceof NotFoundError) {
        return notFound()
      }

      throw error
    }

    return result.unwrap()
  },
)

export const getDocumentByPath = cache(
  async ({ commit, path }: { commit: Commit; path: string }) => {
    const { workspace } = await getCurrentUser()
    const docsScope = new DocumentVersionsRepository(workspace!.id)
    const documents = await docsScope
      .getDocumentsAtCommit(commit)
      .then((r) => r.unwrap())

    const document = documents.find((d) => d.path === path)
    if (!document) throw new NotFoundError('Document not found')

    return document
  },
)