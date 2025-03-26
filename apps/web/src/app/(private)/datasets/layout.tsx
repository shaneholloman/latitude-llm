import { ReactNode } from 'react'

import buildMetatags from '$/app/_lib/buildMetatags'

export const metadata = buildMetatags({
  title: 'Datasets',
})

export default async function DatasetsList({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return children
}
