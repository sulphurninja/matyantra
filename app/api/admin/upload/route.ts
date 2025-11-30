import { parseCSVRows } from '@/lib/csvParser'
import connectDB from '@/lib/mongodb'
import { getAdminSession } from '@/lib/utils'
import User from '@/models/User'
import Voter from '@/models/Voter'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    const session = getAdminSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Read file content
    const text = await file.text()

    // Parse CSV
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            console.log(`CSV parsed: ${results.data.length} rows`)
            console.log('Sample row:', results.data[0])
            
            if (!results.data || results.data.length === 0) {
              resolve(
                NextResponse.json(
                  { error: 'No data found in CSV file' },
                  { status: 400 }
                )
              )
              return
            }

            // Use the flexible parser
            const voters = parseCSVRows(results.data, user._id)

            if (voters.length === 0) {
              resolve(
                NextResponse.json(
                  { error: 'No valid voters found. Check column names match expected format.' },
                  { status: 400 }
                )
              )
              return
            }

            console.log(`Processing ${voters.length} voters...`)

            // Delete existing voters for this user
            await Voter.deleteMany({ userId: user._id })
            console.log('Deleted existing voters')

            // Log sample voter before insertion
            if (voters.length > 0) {
              console.log('Sample voter before DB insert:', JSON.stringify(voters[0], null, 2))
            }

            // Insert new voters in batches to avoid memory issues
            const batchSize = 1000
            for (let i = 0; i < voters.length; i += batchSize) {
              const batch = voters.slice(i, i + batchSize)
              await Voter.insertMany(batch, { ordered: false })
              console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(voters.length / batchSize)}`)
            }

            // Verify one voter was saved correctly
            const sampleVoter = await Voter.findOne({ userId: user._id })
            if (sampleVoter) {
              console.log('Sample voter after DB insert:', JSON.stringify(sampleVoter.toObject(), null, 2))
            }

            console.log(`Successfully imported ${voters.length} voters`)

            resolve(
              NextResponse.json({
                success: true,
                count: voters.length,
              })
            )
          } catch (error: any) {
            console.error('Error processing CSV:', error)
            console.error('Error stack:', error.stack)
            resolve(
              NextResponse.json(
                { error: `Error processing CSV file: ${error.message}` },
                { status: 500 }
              )
            )
          }
        },
        error: (error) => {
          console.error('CSV parse error:', error)
          resolve(
            NextResponse.json(
              { error: `Error parsing CSV file: ${error.message}` },
              { status: 400 }
            )
          )
        },
      })
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

