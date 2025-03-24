import { ConfirmModal } from '@latitude-data/web-ui'
import { GenerateDatasetV1Modal } from '$/app/(private)/datasets/_v1DeprecatedComponents/GenerateDatasetModal'
import { AutogenerateDatasetNotAvailableModal } from './AutogenerateDatasetNotAvailableModal'
import { GenerateDatasetModal } from './GenerateDatasetModal'

export type GenerateInputProps = {
  parameters: string | undefined
  name?: string
  backUrl?: string
}
export function GenerateDatasetCloudModal({
  isV2,
  open,
  onOpenChange,
  isCloud,
  generateInput,
  canNotModify,
}: {
  isV2: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  isCloud: boolean
  generateInput: GenerateInputProps
  canNotModify: boolean
}) {
  if (!isCloud)
    return (
      <AutogenerateDatasetNotAvailableModal
        open={open}
        onOpenChange={onOpenChange}
      />
    )

  if (canNotModify) {
    return (
      <ConfirmModal
        open={open}
        dismissible
        title='Dataset creation disabled'
        description='Maintenance in progress. Please try again later.'
        onConfirm={() => onOpenChange(false)}
        confirm={{
          label: 'Back to datasets',
          description:
            "We're running some maintenance on datasets. At the moment is not possible to create new datasets. Please try again later.",
        }}
      />
    )
  }

  const parameters = generateInput.parameters
    ? generateInput.parameters.split(',')
    : []
  const GenerateModal = isV2 ? GenerateDatasetModal : GenerateDatasetV1Modal
  return (
    <GenerateModal
      open={open}
      onOpenChange={onOpenChange}
      backUrl={generateInput.backUrl}
      name={generateInput.name}
      parameters={parameters}
    />
  )
}
