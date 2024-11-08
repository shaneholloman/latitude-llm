import { useRef } from 'react'

import { Button, useAutoScroll } from '@latitude-data/web-ui'

export default function Preview({ runPrompt }: { runPrompt: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useAutoScroll(containerRef, { startAtBottom: true })

  return (
    <div
      ref={containerRef}
      className='flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar'
    >
      <div className='flex flex-row w-full items-center justify-center'>
        <Button fancy onClick={runPrompt}>
          Run prompt
        </Button>
      </div>
    </div>
  )
}