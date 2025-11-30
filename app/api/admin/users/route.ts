import connectDB from '@/lib/mongodb'
import { generateActivationKey, getAdminSession } from '@/lib/utils'
import User from '@/models/User'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const users = await User.find().sort({ createdAt: -1 })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, phone, expiresAt, whatsappTemplate, slipImageUrl, brandingSplashUrl } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const activationKey = generateActivationKey()
    const userData: any = {
      name,
      activationKey,
      isActive: true,
    }

    if (email) userData.email = email.toLowerCase()
    if (phone) userData.phone = phone
    if (expiresAt) userData.expiresAt = new Date(expiresAt)
    if (whatsappTemplate) userData.whatsappTemplate = whatsappTemplate
    if (slipImageUrl) userData.slipImageUrl = slipImageUrl
    if (brandingSplashUrl) userData.brandingSplashUrl = brandingSplashUrl

    const user = await User.create(userData)

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email or activation key already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

