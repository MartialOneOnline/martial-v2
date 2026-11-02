import { Suspense } from 'react'
import ClassesClient from './ClassesClient'
import RequirePermission from '../../../components/RequirePermission'

export default function ClassesPage() {
  return (
    <RequirePermission permission="school.classes.view">
      <Suspense>
        <ClassesClient />
      </Suspense>
    </RequirePermission>
  )
}
