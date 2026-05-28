import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import { prisma } from './lib/prisma.js'
import { auth } from './middleware/auth.js'

const app  = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// ─── Público ──────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'martial-v2-api' } })
})

// ─── Protegidos (requieren JWT de Supabase) ───────────────────────

// GET /me — devuelve el usuario autenticado
// Si es la primera vez que llama, lo crea en la base de datos
app.get('/me', auth, async (req, res) => {
  const supabaseUser = req.supabaseUser!

  try {
    const user = await prisma.user.upsert({
      where:  { supabaseAuthId: supabaseUser.id },
      update: {},   // no actualizamos nada en llamadas sucesivas
      create: {
        email:         supabaseUser.email!,
        name:          supabaseUser.user_metadata?.name ?? null,
        supabaseAuthId: supabaseUser.id,
        role:          'STUDENT',
      },
      select: {
        id:        true,
        email:     true,
        name:      true,
        role:      true,
        schoolId:  true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json({ success: true, data: user })
  } catch (error) {
    console.error('GET /me error:', error)
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Could not fetch user' },
    })
  }
})

// ─── Temporal ─────────────────────────────────────────────────────
// TODO: eliminar antes del primer deploy
app.get('/db-test', async (_req, res) => {
  try {
    const users   = await prisma.user.count()
    const schools = await prisma.school.count()
    res.json({ status: 'connected', users, schools })
  } catch (error) {
    console.error('DB TEST ERROR:', error)
    res.status(500).json({ status: 'error', message: String(error) })
  }
})

// ─────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Martial V2 API running on http://localhost:${port}`)
})
