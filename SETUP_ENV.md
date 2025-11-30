# Fix MongoDB Connection Error

## The Problem
You're getting this error:
```
Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"
```

This means your `.env` file is either missing or has an invalid `MONGODB_URI`.

## Solution

### Step 1: Create `.env` file

Create a file named `.env` in the `admin-panel` directory with this content:

```env
# MongoDB Connection
# For local MongoDB (if you have MongoDB installed locally):
MONGODB_URI="mongodb://localhost:27017/election_admin"

# OR for MongoDB Atlas (cloud):
# MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/election_admin?retryWrites=true&w=majority"

# JWT Secret (generate a strong random string)
JWT_SECRET="your-secret-key-here-change-in-production"

# Admin Credentials (for initial setup)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
ADMIN_NAME="Admin User"
```

### Step 2: Choose Your MongoDB Option

**Option A: Local MongoDB (if installed)**
```env
MONGODB_URI="mongodb://localhost:27017/election_admin"
```

**Option B: MongoDB Atlas (Free Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Get your connection string
5. Replace username and password:
```env
MONGODB_URI="mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/election_admin?retryWrites=true&w=majority"
```

### Step 3: Restart the Server

After creating/updating `.env`:
1. Stop the server (Ctrl+C)
2. Restart: `npm run dev`

### Step 4: Create Admin User

```bash
npm run create-admin
```

This will create an admin with:
- Email: `admin@example.com` (or your ADMIN_EMAIL)
- Password: `admin123` (or your ADMIN_PASSWORD)

## Quick Check

To verify your `.env` is correct, check that:
- ✅ File exists: `admin-panel/.env`
- ✅ `MONGODB_URI` starts with `mongodb://` or `mongodb+srv://`
- ✅ No extra spaces or quotes issues
- ✅ MongoDB is running (if using local)

## Common Issues

### "MongoDB connection refused"
- **Local MongoDB**: Make sure MongoDB is running (`mongod` or start MongoDB service)
- **MongoDB Atlas**: Check your connection string and network access settings

### "Invalid authentication"
- Check username/password in connection string
- For Atlas: Make sure database user has proper permissions

### Still having issues?
1. Check your `.env` file format
2. Make sure MongoDB is accessible
3. Restart the Next.js server after changing `.env`



