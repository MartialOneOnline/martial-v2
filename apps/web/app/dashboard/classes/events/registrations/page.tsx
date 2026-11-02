import { Suspense } from 'react'
import RegistrationsClient from './RegistrationsClient'
import RequirePermission from '../../../../../components/RequirePermission'
export default function RegistrationsPage() {
  return (
    <RequirePermission permission="school.events.view">
      <Suspense>
        <RegistrationsClient />
      </Suspense>
    </RequirePermission>
  )
}
