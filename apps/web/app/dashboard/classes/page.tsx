import { Suspense } from 'react'
import ClassesClient from './ClassesClient'

export default function ClassesPage() {
  return (
    <Suspense>
      <ClassesClient />
    </Suspense>
  )
}
