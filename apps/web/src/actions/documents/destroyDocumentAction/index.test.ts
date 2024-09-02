import {
  Commit,
  DocumentVersion,
  Project,
  SafeUser,
} from '@latitude-data/core/browser'
import { database } from '@latitude-data/core/client'
import { createDraft, createProject } from '@latitude-data/core/factories'
import { documentVersions } from '@latitude-data/core/schema'
import { and, eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { destroyDocumentAction } from './index'

const mocks = vi.hoisted(() => {
  return {
    getSession: vi.fn(),
  }
})
vi.mock('$/services/auth/getSession', () => ({
  getSession: mocks.getSession,
}))

let draft: Commit
let merged: Commit
let document: DocumentVersion
let project: Project
let userData: SafeUser
describe('destroyDocumentAction', async () => {
  beforeEach(async () => {
    const {
      project: prj,
      user,
      commit: cmt,
      documents: allDocs,
    } = await createProject({
      documents: { doc1: 'Doc 1' },
    })
    const { commit } = await createDraft({ project: prj, user })
    merged = cmt
    userData = user
    project = prj
    draft = commit
    document = allDocs[0]!
  })

  describe('unauthorized', () => {
    it('fails when the user is not authenticated', async () => {
      const [_, error] = await destroyDocumentAction({
        projectId: project.id,
        commitId: draft.id,
        documentUuid: document.documentUuid,
      })

      expect(error!.name).toEqual('UnauthorizedError')
    })
  })

  describe('authorized', () => {
    beforeEach(async () => {
      mocks.getSession.mockReturnValue({ user: userData })
    })

    it('fails when commit from other workspace', async () => {
      const {
        project: otherWorkspaceProject,
        commit: otherCommit,
        documents: allDocs,
      } = await createProject({
        documents: { doc1: 'Doc 1' },
      })
      const otherWorkspaceDocument = allDocs[0]!
      const [_, error] = await destroyDocumentAction({
        projectId: otherWorkspaceProject.id,
        commitId: otherCommit.id,
        documentUuid: otherWorkspaceDocument.documentUuid,
      })
      expect(error?.name).toEqual('NotFoundError')
    })

    it('fails when trying to remove a document from a merged commit', async () => {
      const [_, error] = await destroyDocumentAction({
        projectId: project.id,
        commitId: merged.id,
        documentUuid: document.documentUuid,
      })
      expect(error?.name).toEqual('BadRequestError')
    })

    it('creates a soft deleted documents in draft document', async () => {
      await destroyDocumentAction({
        projectId: project.id,
        commitId: draft.id,
        documentUuid: document.documentUuid,
      })
      // TODO: move to core
      const documents = await database.query.documentVersions.findMany({
        // @ts-ignore
        where: and(eq(documentVersions.documentUuid, document.documentUuid)),
      })

      const drafDocument = documents.find(
        (d: DocumentVersion) => d.commitId === draft.id,
      )
      expect(documents.length).toBe(2)
      expect(drafDocument!.deletedAt).not.toBe(null)
    })
  })
})