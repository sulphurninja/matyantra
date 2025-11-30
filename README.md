# Election Management Admin Panel

Next.js admin panel for managing election data and user activation keys.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Update `.env` with your MongoDB connection string:
```
MONGODB_URI="mongodb://localhost:27017/election_admin"
JWT_SECRET="your-secret-key-here"
```

3. Start MongoDB (if running locally):
```bash
# Make sure MongoDB is running on your system
```

4. Create initial admin user:
```bash
# Run this script or use the API
node scripts/create-admin.js
```

5. Run the development server:
```bash
npm run dev
```

Visit http://localhost:3000

## Features

- **User Management**: Create users with activation keys
- **CSV Upload**: Upload voter data for specific users
- **Activation Key Management**: Expire/renew user accounts
- **Dashboard**: View statistics and manage the system

## API Endpoints

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/verify` - Verify admin session
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `PATCH /api/admin/users/[id]` - Update user (expire/renew)
- `DELETE /api/admin/users/[id]` - Delete user
- `POST /api/admin/upload` - Upload CSV for user

## Mobile App API

The mobile app will use these endpoints:
- `POST /api/app/activate` - Activate with key
- `GET /api/app/voters` - Get voter data (requires activation key)

