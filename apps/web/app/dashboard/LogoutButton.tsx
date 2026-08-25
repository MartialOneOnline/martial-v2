'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function LogoutButton() {
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '0.6rem 1.25rem',
        fontSize: '0.875rem',
        backgroundColor: 'transparent',
        color: '#888',
        border: '1px solid #333',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      Cerrar sesión
    </button>
  )
}
