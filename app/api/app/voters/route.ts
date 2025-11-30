import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Voter from '@/models/Voter'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

function verifyAppToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; activationKey: string }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyAppToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    // Verify user is still active
    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Account expired' },
        { status: 403 }
      )
    }

    // Get query parameters for pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000') // Default 1000 per page
    const skip = (page - 1) * limit

    // Get total count
    const totalCount = await Voter.countDocuments({ userId: decoded.userId })

    // Get voters with pagination
    const voters = await Voter.find({ userId: decoded.userId })
      .select('-__v')
      .skip(skip)
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      voters: voters.map((v) => ({
        id: v._id.toString(),
        name: v.name,
        age: v.age,
        gender: v.gender,
        address: v.address,
        area: v.area,
        booth: v.booth,
        partNo: v.part,
        sectionNo: v.section,
        mobileNo: v.mobile,
        whatsapp: v.whatsapp,
        email: v.email,
        serialNo: v.serialNo,
        houseNo: v.houseNo,
        voterId: v.voterId,
        relation: v.relation,
        status: v.status,
        relativeName: v.relativeName,
        nameMarathi: v.nameMarathi,
        isDead: v.isDead,
        hasVoted: v.hasVoted,
        dob: v.dob,
        caste: v.caste,
        occupation: v.occupation,
        extraInfo1: v.extraInfo1,
        extraInfo2: v.extraInfo2,
        extraInfo3: v.extraInfo3,
        notes: v.notes,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + voters.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching voters:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

