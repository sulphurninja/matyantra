import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/utils'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Voter from '@/models/Voter'

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ isActive: true })
    const expiredUsers = await User.countDocuments({ isActive: false })
    const totalVoters = await Voter.countDocuments()

    return NextResponse.json({
      totalUsers,
      activeUsers,
      expiredUsers,
      totalVoters,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

