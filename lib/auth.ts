import { compare, hash } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Admin from '@/models/Admin'
import connectDB from './mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface AdminSession {
  id: string
  email: string
  name?: string
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

export async function createAdmin(email: string, password: string, name?: string) {
  await connectDB()
  const hashedPassword = await hashPassword(password)
  return Admin.create({
    email,
    password: hashedPassword,
    name,
  })
}

export async function verifyAdmin(email: string, password: string): Promise<AdminSession | null> {
  await connectDB()
  const admin = await Admin.findOne({ email: email.toLowerCase() })

  if (!admin) return null

  const isValid = await verifyPassword(password, admin.password)
  if (!isValid) return null

  return {
    id: admin._id.toString(),
    email: admin.email,
    name: admin.name || undefined,
  }
}

export function createToken(session: AdminSession): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AdminSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminSession
  } catch {
    return null
  }
}

