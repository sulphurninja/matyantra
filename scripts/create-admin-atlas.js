require('dotenv').config({ path: '.env' })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Get MongoDB URI from env, remove quotes if present
let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/election_admin'
mongoUri = mongoUri.replace(/^['"]|['"]$/g, '')

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
}, { timestamps: true })

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema)

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...')
    console.log('URI:', mongoUri.substring(0, 30) + '...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    const name = process.env.ADMIN_NAME || 'Admin'

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() })
    if (existingAdmin) {
      console.log('⚠️  Admin already exists with email:', email)
      console.log('   To reset password, run: npm run reset-admin\n')
      process.exit(0)
    }

    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash(password, 12)
    const admin = await Admin.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
    })

    console.log('\n✅ Admin created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', password)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n⚠️  Please change the password after first login!\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating admin:', error.message)
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure MongoDB Atlas connection string is correct in .env')
    }
    process.exit(1)
  }
}

createAdmin()









