import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import LogoutButton from './LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName = user.user_metadata?.name ?? user.email

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <span style={{ fontWeight: '700', fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
          Martial
        </span>
        <LogoutButton />
      </header>

      {/* Content */}
      <main style={{ padding: '3rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Bienvenido, {displayName}
        </h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          Dashboard en construcción.
        </p>
      </main>
    </div>
  )
}
