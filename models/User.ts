import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  name: string
  email?: string
  phone?: string
  activationKey: string
  isActive: boolean
  expiresAt?: Date
  whatsappTemplate?: string
  slipImageUrl?: string
  brandingSplashUrl?: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
    },
    activationKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
    },
    whatsappTemplate: {
      type: String,
      default: `*-----Voter Slip-----*
नमस्कार
*पिंपरी-चिंचवड महानगरपालिका निवडणूक 2025*

उमेदवार : *इम्तियाज अफजल खान*

पार्टी : राष्ट्रवादी
निशाणी : घड्याळ

 Your Family slip 
 *----------voter_details----------*

नाव  : {{name}}
Relative Name : {{relativeName}}
प्रभाग  : {{partNo}}
अक्र : {{sectionNo}}
विधानसभा क्र : {{serialNo}}
मतदान कार्ड : {{voterId}}
घर क्र : {{houseNo}}
मतदान केंद्र : {{booth}} - {{area}}
-------------------


धन्यवाद`,
    },
    slipImageUrl: {
      type: String,
    },
    brandingSplashUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

