import connectDB from '@/lib/mongodb'
import { getAdminSession } from '@/lib/utils'
import User from '@/models/User'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, phone, isActive, expiresAt, whatsappTemplate, slipImageUrl, brandingSplashUrl } = await request.json()
    await connectDB()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email ? email.toLowerCase() : null
    if (phone !== undefined) updateData.phone = phone || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    }
    if (whatsappTemplate !== undefined) updateData.whatsappTemplate = whatsappTemplate || null
    if (slipImageUrl !== undefined) updateData.slipImageUrl = slipImageUrl || null
    if (brandingSplashUrl !== undefined) updateData.brandingSplashUrl = brandingSplashUrl || null

    const user = await User.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    await User.findByIdAndDelete(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

