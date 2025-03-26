import { Result } from '../../lib'
import { DatasetV2, Workspace } from '../../browser'
import { buildDocumentLogDatasetRows } from '../documentLogs/buildDocumentLogDatasetRows'
import { DatasetRowsRepository, DatasetsV2Repository } from '../../repositories'
import { HashAlgorithmFn, nanoidHashAlgorithm } from './utils'

async function getFirstRowsFromDataset({
  dataset,
}: {
  dataset: DatasetV2 | undefined
}) {
  if (!dataset) return []

  const repo = new DatasetRowsRepository(dataset.workspaceId)
  const rows = await repo.findByDatasetPaginated({
    datasetId: dataset.id,
    pageSize: '5',
  })
  return rows.map((row) => row.rowData)
}

export const previewDatasetFromLogs = async ({
  workspace,
  data,
  hashAlgorithm = nanoidHashAlgorithm,
}: {
  workspace: Workspace
  data: {
    name: string
    documentLogIds: number[]
  }
  hashAlgorithm?: HashAlgorithmFn
}) => {
  const repo = new DatasetsV2Repository(workspace.id)
  const datasets = await repo.findByName(data.name)
  const dataset = datasets[0]
  const result = await buildDocumentLogDatasetRows({
    workspace,
    documentLogIds: data.documentLogIds,
    dataset,
    hashAlgorithm,
  })
  const datasetRows = await getFirstRowsFromDataset({ dataset })

  if (result.error) return result

  return Result.ok({
    columns: result.value.columns,
    existingRows: datasetRows,
    newRows: result.value.rows,
  })
}
