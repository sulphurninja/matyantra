import mongoose from 'mongoose'

// Remove quotes if present
let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/election_admin'
mongoUri = mongoUri.replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
const MONGODB_URI = mongoUri

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env')
}

// Validate MongoDB URI format
if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  throw new Error(
    `Invalid MONGODB_URI format. Expected "mongodb://" or "mongodb+srv://" but got: ${MONGODB_URI.substring(0, 20)}...\n` +
    'Please check your .env file and ensure MONGODB_URI starts with mongodb:// or mongodb+srv://'
  )
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB

