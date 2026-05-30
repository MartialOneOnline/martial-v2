import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import type { User, ApiResponse } from '@repo/types'
import LogoutButton from './LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  // getUser valida el JWT contra Supabase — es la verificación de seguridad
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // getSession nos da el access_token para llamar a nuestra API
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // Llamamos a nuestra API — esto crea el usuario en la DB si es la primera vez
  let dbUser: User | null = null
  let apiError: string | null = null

  try {
    const res = await fetch(`${process.env.API_URL}/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
    const body = (await res.json()) as ApiResponse<User>

    if (body.success) {
      dbUser = body.data
    } else {
      apiError = body.error.message
    }
  } catch {
    apiError = 'No se pudo conectar con la API'
  }

  const displayName = dbUser?.name ?? user.email

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
        <h1 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '2rem' }}>
          Bienvenido, {displayName}
        </h1>

        {/* Ficha del usuario desde la DB */}
        {dbUser ? (
          <div style={{
            backgroundColor: '#111',
            border: '1px solid #1f1f1f',
            borderRadius: '10px',
            padding: '1.5rem',
            maxWidth: '420px',
          }}>
            <p style={{ fontSize: '0.7rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
              Usuario · Base de datos
            </p>
            <Row label="ID"       value={dbUser.id} mono />
            <Row label="Email"    value={dbUser.email} />
            <Row label="Nombre"   value={dbUser.name ?? '—'} />
            <Row label="Rol"      value={dbUser.role} />
            <Row label="Escuela"  value={dbUser.schoolId ?? 'Sin asignar'} />
            <Row label="Registro" value={new Date(dbUser.createdAt).toLocaleDateString('es-ES')} />
          </div>
        ) : (
          <div style={{
            backgroundColor: '#1a0a0a',
            border: '1px solid #3f1a1a',
            borderRadius: '10px',
            padding: '1.25rem',
            maxWidth: '420px',
          }}>
            <p style={{ color: '#f87171', fontSize: '0.875rem', margin: 0 }}>
              Error conectando con la API: {apiError}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// Componente auxiliar para mostrar una fila de datos
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem 0',
      borderBottom: '1px solid #1a1a1a',
      gap: '1rem',
    }}>
      <span style={{ color: '#555', fontSize: '0.8rem', flexShrink: 0 }}>{label}</span>
      <span style={{
        color: '#ccc',
        fontSize: mono ? '0.7rem' : '0.875rem',
        fontFamily: mono ? 'monospace' : 'inherit',
        textAlign: 'right',
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  )
}
