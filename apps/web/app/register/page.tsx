'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function RegisterPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleRegister() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '4rem auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Martial App V2</h1>
      <h2 style={{ marginBottom: '1rem', fontWeight: 'normal' }}>Crear cuenta</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '0.6rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '0.6rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '0.6rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        {error && (
          <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>
        )}
        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: '#1A56A0',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Registrando...' : 'Crear cuenta'}
        </button>
        <a href="/login" style={{ textAlign: 'center', color: '#1A56A0', fontSize: '0.875rem' }}>
          ¿Ya tienes cuenta? Inicia sesión
        </a>
      </div>
    </div>
  )
}
