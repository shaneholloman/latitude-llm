import { ExperimentFormPayload } from '../useExperimentFormPayload'
import { Skeleton } from '@latitude-data/web-ui/atoms/Skeleton'
import { useCallback, useEffect, useState } from 'react'
import { Input } from '@latitude-data/web-ui/atoms/Input'
import { FormFieldGroup } from '@latitude-data/web-ui/atoms/FormFieldGroup'
import { ReactStateDispatch } from '@latitude-data/web-ui/commonTypes'
import { SwitchInput } from '@latitude-data/web-ui/atoms/Switch'
import useDatasetRowsCount from '$/stores/datasetRowsCount'
import { Text } from '@latitude-data/web-ui/atoms/Text'

type Range = { from: number; to: number }

function scopedInRange(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function LineRangeInputs({
  disabled,
  defaultRange,
  onChangeRange,
  max,
}: {
  disabled: boolean
  defaultRange: Range
  onChangeRange: ReactStateDispatch<Range>
  max: number | undefined
}) {
  const setFromValue = useCallback(
    (value: number) => {
      const newVal = scopedInRange(value, 1, max ?? value)
      onChangeRange((prev) => ({
        from: newVal,
        to: Math.max(newVal, prev.to),
      }))
    },
    [onChangeRange],
  )

  const setToValue = useCallback(
    (value: number) => {
      const newVal = scopedInRange(value, 1, max ?? value)
      onChangeRange((prev) => ({
        from: Math.min(newVal, prev.from),
        to: newVal,
      }))
    },
    [onChangeRange],
  )

  return (
    <FormFieldGroup>
      <Input
        disabled={disabled}
        type='number'
        name='fromLine'
        label='From line'
        value={defaultRange.from}
        placeholder='Starting line'
        onChange={(e) => setFromValue(Number(e.target.value))}
        min={1}
        max={max}
      />
      <Input
        disabled={disabled}
        type='number'
        name='toLine'
        label='To line'
        placeholder='Ending line'
        value={defaultRange.to}
        onChange={(e) => setToValue(Number(e.target.value))}
        min={1}
        max={max}
      />
    </FormFieldGroup>
  )
}

function RowsInputs({
  rowCount,
  setFromLine,
  setToLine,
}: {
  rowCount: number
  setFromLine: (value: number | undefined) => void
  setToLine: (value: number | undefined) => void
}) {
  const [selectedRows, setSelectedRows] = useState<Range>({
    from: 1,
    to: rowCount,
  })
  const [allRows, setAllRows] = useState(true)

  useEffect(() => {
    if (allRows) {
      setFromLine(undefined)
      setToLine(undefined)
    } else {
      setFromLine(selectedRows.from)
      setToLine(selectedRows.to)
    }
  }, [allRows, selectedRows, setFromLine, setToLine])

  return (
    <div className='flex flex-col gap-y-2'>
      <LineRangeInputs
        disabled={allRows}
        defaultRange={selectedRows}
        onChangeRange={setSelectedRows}
        max={rowCount}
      />
      <SwitchInput
        name='fullDataset'
        defaultChecked={allRows}
        onCheckedChange={() => setAllRows((prev) => !prev)}
        label='Include all lines'
        description='You can pass to evaluations all lines from a dataset or a selection from one line to another. Uncheck this option to select the lines.'
      />
    </div>
  )
}

export function DatasetRowsInput({
  selectedDataset,
  setFromLine,
  setToLine,
}: ExperimentFormPayload) {
  const { data: rowCount, isLoading: isLoadingRowCount } = useDatasetRowsCount({
    dataset: selectedDataset,
  })

  if (!selectedDataset) {
    return <Text.H6 color='foregroundMuted'>You must select a dataset</Text.H6>
  }

  if (isLoadingRowCount) {
    return (
      <div className='flex flex-col gap-y-2'>
        <Skeleton height='h2' className='w-1/2' />
        <Skeleton height='h2' className='w-1/2' />
      </div>
    )
  }

  return (
    <RowsInputs
      rowCount={rowCount!}
      setFromLine={setFromLine}
      setToLine={setToLine}
    />
  )
}
