// ─────────────────────────────────────────────
// Tipos compartidos — Martial App V2
// Fuente de verdad para API, web y mobile
// ─────────────────────────────────────────────

// Roles del sistema
// Deben coincidir exactamente con el enum del schema de Prisma
export type Role = 'SUPERADMIN' | 'SCHOOL_OWNER' | 'INSTRUCTOR' | 'STUDENT'

// Usuario — espejo del modelo User de Prisma
// Las fechas son string porque viajan como JSON por la API
export interface User {
  id: string
  email: string
  name: string | null
  role: Role
  schoolId: string | null
  createdAt: string
  updatedAt: string
}

// Escuela — espejo del modelo School de Prisma
export interface School {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// Respuestas de la API
// Todos los endpoints devuelven este formato
// ─────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
