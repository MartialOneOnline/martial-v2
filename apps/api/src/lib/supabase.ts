import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con la clave de servicio (SUPABASE_SECRET_KEY)
// Solo se usa en el servidor — nunca se expone al cliente
// La clave de servicio bypasea RLS — usarla solo para operaciones de sistema
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.SUPABASE_SECRET_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
