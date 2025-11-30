import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Verify token
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    await connectDB()

    // Find user by activation key
    const user = await User.findOne({ activationKey: decoded.activationKey })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is still active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account has been expired' },
        { status: 403 }
      )
    }

    // Check if account has expired
    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
      await User.findByIdAndUpdate(user._id, { isActive: false })
      return NextResponse.json(
        { error: 'Account has expired' },
        { status: 403 }
      )
    }

    // Return updated user configuration
    return NextResponse.json({
      success: true,
      config: {
        whatsappTemplate: user.whatsappTemplate,
        slipImageUrl: user.slipImageUrl,
        brandingSplashUrl: user.brandingSplashUrl,
      },
    })
  } catch (error) {
    console.error('Config refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

