import { faker } from '@faker-js/faker'
import { unsafelyGetUser } from '$core/data-access'
import { CommitsRepository } from '$core/repositories'
import { DocumentVersion, Workspace, type SafeUser } from '$core/schema'
import { createNewDocument, mergeCommit, updateDocument } from '$core/services'
import { createProject as createProjectFn } from '$core/services/projects'

import { createDraft } from './commits'
import { createWorkspace, type ICreateWorkspace } from './workspaces'

export type IDocumentStructure = { [key: string]: string | IDocumentStructure }

async function flattenDocumentStructure({
  currentPath = '',
  documents,
}: {
  currentPath?: string
  documents: IDocumentStructure
}): Promise<{ path: string; content: string }[]> {
  const result: { path: string; content: string }[] = []

  for (const [key, value] of Object.entries(documents)) {
    const childPath = currentPath ? `${currentPath}/${key}` : key
    if (typeof value === 'string') {
      result.push({ path: childPath, content: value })
    } else {
      const nested = await flattenDocumentStructure({
        currentPath: childPath,
        documents: value,
      })
      result.push(...nested)
    }
  }

  return result
}

export type ICreateProject = {
  name?: string
  workspace?: Workspace | ICreateWorkspace
  documents?: IDocumentStructure
}
export async function createProject(projectData: Partial<ICreateProject> = {}) {
  let workspaceData = projectData.workspace ?? {}
  let user: SafeUser
  let workspace: Workspace

  if ('id' in workspaceData) {
    user = (await unsafelyGetUser(workspaceData.creatorId!)) as SafeUser
    workspace = workspaceData as Workspace
  } else {
    const newWorkspace = await createWorkspace(workspaceData)
    workspace = newWorkspace.workspace
    user = newWorkspace.userData
  }

  const randomName = faker.commerce.department()
  const { name } = projectData

  const result = await createProjectFn({
    name: name ?? randomName,
    workspaceId: workspace.id,
  })
  const project = result.unwrap()
  const commitsScope = new CommitsRepository(workspace.id)
  let commit = (await commitsScope.getFirstCommitForProject(project)).unwrap()

  const documents: DocumentVersion[] = []

  if (projectData.documents) {
    const documentsToCreate = await flattenDocumentStructure({
      documents: projectData.documents,
    })
    const { commit: draft } = await createDraft({ project })
    for await (const { path, content } of documentsToCreate) {
      const newDoc = await createNewDocument({ commit: draft, path }).then(
        (r) => r.unwrap(),
      )
      const updatedDoc = await updateDocument({
        commit: draft,
        document: newDoc,
        content,
      })
      documents.push(updatedDoc.unwrap())
    }
    commit = await mergeCommit(draft).then((r) => r.unwrap())
  }

  return { project, user, workspace, documents, commit: commit! }
}