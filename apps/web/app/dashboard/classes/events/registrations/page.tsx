import { Suspense } from 'react'
import RegistrationsClient from './RegistrationsClient'
export default function RegistrationsPage() {
  return (
    <Suspense>
      <RegistrationsClient />
    </Suspense>
  )
}
