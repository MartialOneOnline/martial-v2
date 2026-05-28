import type { User as SupabaseUser } from '@supabase/supabase-js'

// Extendemos el tipo Request de Express para que incluya el usuario
// de Supabase después de pasar por el middleware de autenticación
declare global {
  namespace Express {
    interface Request {
      supabaseUser?: SupabaseUser
    }
  }
}
