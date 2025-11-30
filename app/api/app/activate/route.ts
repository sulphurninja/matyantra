import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { activationKey } = await request.json()

    if (!activationKey) {
      return NextResponse.json(
        { error: 'Activation key is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findOne({ activationKey })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid activation key' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account has been expired. Please contact admin.' },
        { status: 403 }
      )
    }

    // Check if account has expired
    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
      await User.findByIdAndUpdate(user._id, { isActive: false })
      return NextResponse.json(
        { error: 'Account has expired. Please contact admin.' },
        { status: 403 }
      )
    }

    // Create token for mobile app
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        activationKey: user.activationKey,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        activationKey: user.activationKey,
        whatsappTemplate: user.whatsappTemplate,
        slipImageUrl: user.slipImageUrl,
        brandingSplashUrl: user.brandingSplashUrl,
      },
    })
  } catch (error) {
    console.error('Activation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

