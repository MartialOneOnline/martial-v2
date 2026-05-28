import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'

// Middleware de autenticación
// Verifica el JWT de Supabase que llega en el header Authorization
// Si es válido, adjunta el usuario al request y llama a next()
// Si no lo es, devuelve 401
export async function auth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authorization header required: Bearer <token>',
      },
    })
    return
  }

  const token = authHeader.split(' ')[1]

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Token not found in Authorization header',
      },
    })
    return
  }

  // Verificamos el JWT contra Supabase — si expiró o es inválido, falla aquí
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token invalid or expired',
      },
    })
    return
  }

  // Adjuntamos el usuario al request para que los handlers lo usen
  req.supabaseUser = user
  next()
}
