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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const voterId = params.id

    // Find and update the voter
    const voter = await Voter.findOne({ _id: voterId, userId: user._id })
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    // Update allowed fields
    const allowedFields = [
      'name',
      'age',
      'gender',
      'address',
      'area',
      'booth',
      'part',
      'section',
      'serialNo',
      'houseNo',
      'mobile',
      'whatsapp',
      'email',
      'voterId',
      'relation',
      'status',
      'relativeName',
      'nameMarathi',
      'isDead',
      'hasVoted',
      'dob',
      'caste',
      'occupation',
      'extraInfo1',
      'extraInfo2',
      'extraInfo3',
      'notes',
    ]

    console.log('Received update request for voter:', voterId)
    console.log('Update body:', body)
    
    allowedFields.forEach((field) => {
      if (field in body) {
        const value = body[field]
        // Handle null/undefined explicitly
        if (value === null || value === undefined) {
          ;(voter as any)[field] = undefined
        } else {
          ;(voter as any)[field] = value
        }
        console.log(`Updating field ${field}:`, value)
      }
    })

    await voter.save()
    console.log('Voter saved successfully. Updated voter:', voter.toObject())

    return NextResponse.json({
      success: true,
      voter: {
        id: voter._id.toString(),
        name: voter.name,
        age: voter.age,
        gender: voter.gender,
        address: voter.address,
        area: voter.area,
        booth: voter.booth,
        partNo: voter.part,
        sectionNo: voter.section,
        serialNo: voter.serialNo,
        houseNo: voter.houseNo,
        mobileNo: voter.mobile,
        whatsapp: voter.whatsapp,
        email: voter.email,
        voterId: voter.voterId,
        relation: voter.relation,
        status: voter.status,
        relativeName: voter.relativeName,
        nameMarathi: voter.nameMarathi,
        isDead: voter.isDead,
        hasVoted: voter.hasVoted,
        dob: voter.dob,
        caste: voter.caste,
        occupation: voter.occupation,
        extraInfo1: voter.extraInfo1,
        extraInfo2: voter.extraInfo2,
        extraInfo3: voter.extraInfo3,
        notes: voter.notes,
      },
    })
  } catch (error) {
    console.error('Error updating voter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

