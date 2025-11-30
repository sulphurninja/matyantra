import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IVoter extends Document {
  userId: Types.ObjectId
  name: string
  age?: number
  gender?: string
  address?: string
  area?: string
  booth?: string
  part?: string
  section?: string
  serialNo?: number
  houseNo?: string
  mobile?: string
  whatsapp?: string
  email?: string
  voterId?: string
  relation?: string
  status?: string
  relativeName?: string
  nameMarathi?: string
  isDead?: boolean
  hasVoted?: boolean
  dob?: Date
  caste?: string
  occupation?: string
  extraInfo1?: string
  extraInfo2?: string
  extraInfo3?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const VoterSchema = new Schema<IVoter>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
    },
    address: {
      type: String,
    },
    area: {
      type: String,
      index: true,
    },
    booth: {
      type: String,
      index: true,
    },
    part: {
      type: String,
    },
    section: {
      type: String,
    },
    serialNo: {
      type: Number,
    },
    houseNo: {
      type: String,
    },
    mobile: {
      type: String,
    },
    whatsapp: {
      type: String,
    },
    email: {
      type: String,
    },
    voterId: {
      type: String,
    },
    relation: {
      type: String,
    },
    status: {
      type: String,
    },
    relativeName: {
      type: String,
    },
    nameMarathi: {
      type: String,
    },
    isDead: {
      type: Boolean,
      default: false,
    },
    hasVoted: {
      type: Boolean,
      default: false,
    },
    dob: {
      type: Date,
    },
    caste: {
      type: String,
    },
    occupation: {
      type: String,
    },
    extraInfo1: {
      type: String,
    },
    extraInfo2: {
      type: String,
    },
    extraInfo3: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.Voter || mongoose.model<IVoter>('Voter', VoterSchema)

