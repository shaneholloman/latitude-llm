import { useCallback, useEffect, useMemo, useRef } from 'react'

import {
  DocumentLog,
  DocumentVersion,
  INPUT_SOURCE,
  Inputs,
  InputSource,
  PlaygroundInput,
} from '@latitude-data/core/browser'
import type { ConversationMetadata } from 'promptl-ai'
import {
  AppLocalStorage,
  useLocalStorage,
} from '@latitude-data/web-ui/hooks/useLocalStorage'
import { useCurrentProject } from '@latitude-data/web-ui/providers'
import { useMetadataParameters } from './metadataParametersStore'
import {
  type InputsByDocument,
  EMPTY_INPUTS,
  getDocState,
  getInputsBySource,
  mapLogParametersToInputs,
  recalculateAllInputs,
  updateInputsState,
} from './utils'
import { useDatasetUtils } from '$/hooks/useDocumentParameters/datasetUtils'
import { detectParamChanges } from './detectParameterChanges'

function convertToParams(inputs: Inputs<InputSource>) {
  return Object.fromEntries(
    Object.entries(inputs).map(([key, input]) => {
      try {
        return [key, JSON.parse(input.value)]
      } catch (e) {
        return [key, input?.value?.toString?.()]
      }
    }),
  )
}

export function useDocumentParameters({
  document,
  commitVersionUuid,
  metadata,
}: {
  document: DocumentVersion
  commitVersionUuid: string
  metadata?: ConversationMetadata | undefined
}) {
  const { metadataParameters, setParameters, emptyInputs } =
    useMetadataParameters()
  const { project } = useCurrentProject()
  const projectId = project.id
  const commitUuid = commitVersionUuid
  // TODO: Delete stale inputs as new inputs could eventually not fit
  const { value: allInputs, setValue } = useLocalStorage<InputsByDocument>({
    key: AppLocalStorage.playgroundParameters,
    defaultValue: {},
  })
  const key = `${commitVersionUuid}:${document.documentUuid}`
  const inputs = allInputs[key] ?? EMPTY_INPUTS
  const source = inputs.source
  const dsId = document.datasetV2Id
  let inputsBySource = getInputsBySource({
    source,
    inputs,
    datasetId: dsId,
    emptyInputs,
  })
  const { setDataset, isAssigning } = useDatasetUtils({
    key,
    source,
    projectId,
    commitUuid,
    document,
    allInputs,
    setValue,
  })

  const setManualInputs = useCallback(
    (newInputs: Inputs<'manual'>) => {
      setValue((old) =>
        updateInputsState({
          key,
          source: 'manual',
          oldState: old,
          newInputs,
        }),
      )
    },
    [setValue, key],
  )

  const setHistoryInputs = useCallback(
    (newInputs: Inputs<'history'>) =>
      setValue((old) =>
        updateInputsState({
          key,
          source: 'history',
          oldState: old,
          newInputs,
        }),
      ),
    [setValue],
  )

  const setInput = useCallback(
    <S extends InputSource>(
      currentSource: S,
      value: PlaygroundInput<S>,
      param: string,
    ) => {
      switch (currentSource) {
        case INPUT_SOURCE.manual: {
          setManualInputs({ ...inputsBySource, [param]: value })
          break
        }
        case INPUT_SOURCE.history: {
          setHistoryInputs({ ...inputsBySource, [param]: value })
          break
        }
      }
    },
    [source, inputsBySource],
  )

  const setManualInput = useCallback(
    (param: string, value: PlaygroundInput<'manual'>) => {
      setInput(source, value, param)
    },
    [setInput, source],
  )

  const setHistoryInput = useCallback(
    (param: string, value: PlaygroundInput<'history'>) => {
      setInput(source, value, param)
    },
    [setInput, source],
  )

  const setSource = useCallback(
    (source: InputSource) => {
      setValue((prev) => {
        const { state, doc } = getDocState(prev, key)
        return {
          ...state,
          [key]: {
            ...doc,
            source,
          },
        }
      })
    },
    [key, setValue],
  )

  const copyDatasetToManual = useCallback(() => {
    const dsInputs = dsId ? (inputs.datasetV2?.[dsId]?.inputs ?? {}) : {}
    setManualInputs(dsInputs)
  }, [inputs.datasetV2, dsId])

  const setHistoryLog = useCallback(
    (logUuid: string) => {
      setValue((old) => {
        const { state, doc } = getDocState(old, key)
        return {
          ...state,
          [key]: {
            ...doc,
            history: {
              ...doc.history,
              logUuid,
            },
          },
        }
      })
    },
    [allInputs, key, setValue],
  )

  const mapDocParametersToInputs = useCallback(
    ({ parameters }: { parameters: DocumentLog['parameters'] }) => {
      setValue((old) => {
        const { doc } = getDocState(old, key)
        const sourceInputs = doc.history.inputs
        const newInputs = mapLogParametersToInputs({
          emptyInputs: emptyInputs.history,
          inputs: sourceInputs,
          parameters,
        })

        if (!newInputs) return old

        return updateInputsState({
          key,
          source: 'history',
          oldState: old,
          newInputs,
        })
      })
    },
    [inputs, key, setValue, emptyInputs.history],
  )

  const onMetadataChange = useCallback(
    (metadata: ConversationMetadata) => {
      setValue((oldState) => {
        const prevInputs = useMetadataParameters.getState().prevInputs
        const dsId = document.datasetV2Id
        return recalculateAllInputs({
          key,
          oldState,
          metadata,
          config: {
            manual: {
              fallbackInputs: prevInputs?.manual?.inputs,
            },
            history: {
              fallbackInputs: prevInputs?.history?.inputs,
            },
            datasetV2: {
              datasetId: dsId,
              fallbackInputs: dsId
                ? prevInputs?.datasetV2?.[dsId]?.inputs
                : undefined,
            },
          },
        })
      })
    },
    [key, document.datasetId, setValue],
  )
  const lastMetadataRef = useRef<ConversationMetadata | null>(null)

  const snapshotCurrentDoc = useCallback(() => {
    setValue((oldState) => {
      const { doc } = getDocState(oldState, key)
      useMetadataParameters.getState().setPrevInputs(doc)
      return oldState
    })
  }, [key, setValue])

  useEffect(() => {
    if (!metadata) return

    if (!lastMetadataRef.current) {
      lastMetadataRef.current = metadata
    }

    const prevParams = lastMetadataRef.current.parameters
    const nextParams = metadata.parameters
    const { removed } = detectParamChanges(prevParams, nextParams)

    if (removed.length > 0) {
      snapshotCurrentDoc()
    }

    setParameters(Array.from(nextParams))
    onMetadataChange(metadata)
    lastMetadataRef.current = metadata
  }, [metadata, setParameters, onMetadataChange])

  const parameters = useMemo(() => {
    if (!metadataParameters) return undefined

    return convertToParams(inputsBySource)
  }, [inputsBySource])

  return {
    metadataParameters,
    parameters,
    source,
    setSource,
    setInput,
    manual: {
      inputs: inputs['manual'].inputs,
      setInput: setManualInput,
      setInputs: setManualInputs,
    },
    datasetV2: {
      isAssigning,
      assignedDatasets: inputs.datasetV2 ?? {},
      datasetRowId: dsId ? inputs?.datasetV2?.[dsId]?.datasetRowId : undefined,
      inputs: dsId
        ? (inputs.datasetV2?.[dsId]?.inputs ?? emptyInputs.datasetV2)
        : emptyInputs.datasetV2,
      mappedInputs: dsId ? (inputs.datasetV2?.[dsId]?.mappedInputs ?? {}) : {},
      setDataset,
      copyToManual: copyDatasetToManual,
    },
    history: {
      logUuid: inputs['history'].logUuid,
      inputs: inputs['history'].inputs,
      setInput: setHistoryInput,
      setInputs: setHistoryInputs,
      setHistoryLog,
      mapDocParametersToInputs,
    },
  }
}

export type UseDocumentParameters = ReturnType<typeof useDocumentParameters>
