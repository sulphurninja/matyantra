const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/election_admin'

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
}, { timestamps: true })

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function resetPassword() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    const email = await question('Enter admin email: ')
    if (!email) {
      console.log('❌ Email is required')
      process.exit(1)
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() })
    if (!admin) {
      console.log(`❌ Admin with email ${email} not found`)
      process.exit(1)
    }

    const newPassword = await question('Enter new password: ')
    if (!newPassword || newPassword.length < 6) {
      console.log('❌ Password must be at least 6 characters')
      process.exit(1)
    }

    const confirmPassword = await question('Confirm new password: ')
    if (newPassword !== confirmPassword) {
      console.log('❌ Passwords do not match')
      process.exit(1)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    admin.password = hashedPassword
    await admin.save()

    console.log('\n✅ Password updated successfully!')
    console.log(`\nYou can now login with:`)
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${newPassword}\n`)

    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    rl.close()
    process.exit(1)
  }
}

resetPassword()









