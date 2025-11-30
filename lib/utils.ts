import { verifyToken } from './auth'
import { NextRequest } from 'next/server'

export function getAdminSession(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function generateActivationKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars
  let key = ''
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-'
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

