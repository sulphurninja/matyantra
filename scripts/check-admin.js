const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/election_admin'

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
}, { timestamps: true })

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema)

async function checkAdmin() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    const admins = await Admin.find().select('email name createdAt').lean()
    
    if (admins.length === 0) {
      console.log('❌ No admin users found!')
      console.log('\nTo create an admin, run:')
      console.log('  node scripts/create-admin.js\n')
      console.log('Or set these environment variables and run create-admin.js:')
      console.log('  ADMIN_EMAIL=your-email@example.com')
      console.log('  ADMIN_PASSWORD=your-password')
      console.log('  ADMIN_NAME=Your Name')
      process.exit(1)
    }

    console.log(`Found ${admins.length} admin user(s):\n`)
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Email: ${admin.email}`)
      console.log(`   Name: ${admin.name || 'Not set'}`)
      console.log(`   Created: ${new Date(admin.createdAt).toLocaleString()}\n`)
    })

    console.log('⚠️  Note: Passwords are hashed and cannot be displayed.')
    console.log('If you forgot your password, you can:')
    console.log('1. Delete the admin from database and create a new one')
    console.log('2. Or update the password directly in MongoDB\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure MongoDB is running!')
      console.log('   Start MongoDB: mongod')
      console.log('   Or check your MONGODB_URI in .env file')
    }
    process.exit(1)
  }
}

checkAdmin()









