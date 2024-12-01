import { CsvData } from '@latitude-data/core/browser'
import { Input, TableSkeleton, Text } from '@latitude-data/web-ui'
import { CsvPreviewTable } from '$/app/(private)/datasets/generate/CsvPreviewTable'

function LogsCsvPreview({
  csvData,
  rows,
}: {
  csvData?: CsvData
  rows: number
}) {
  return rows && csvData ? (
    <div className='animate-in fade-in duration-300 flex flex-col gap-2 max-h-80 overlo'>
      <CsvPreviewTable csvData={csvData} />
    </div>
  ) : (
    <div className='animate-in fade-in slide-in-from-top-5 duration-300 overflow-y-hidden custom-scrollbar'>
      <TableSkeleton rows={Math.min(8, rows || 8)} cols={5} maxHeight={320} />
    </div>
  )
}

export function ExportLogsContent({
  csvData,
  selectedRowCount,
  datasetAlreadyExists,
  datasetName,
  setDatasetName,
}: {
  csvData?: CsvData
  selectedRowCount: number
  datasetAlreadyExists: boolean
  datasetName: string
  setDatasetName: (name: string) => void
}) {
  return (
    <div className='flex flex-col gap-2'>
      <Text.H5B>Name</Text.H5B>
      <Input
        value={datasetName}
        onChange={(e) => setDatasetName(e.target.value)}
        placeholder='Dataset Name'
        errors={
          datasetAlreadyExists
            ? ['A Dataset with this name already exists']
            : undefined
        }
      />
      <Text.H5B>Preview</Text.H5B>
      <LogsCsvPreview csvData={csvData} rows={selectedRowCount} />
    </div>
  )
}