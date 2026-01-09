# Admin Panel Login Credentials

## Default Credentials

If you just ran `npm run create-admin` or `node scripts/create-admin.js`, the default credentials are:

**From environment variables (.env file):**
- Email: Value of `ADMIN_EMAIL` (default: `admin@example.com`)
- Password: Value of `ADMIN_PASSWORD` (default: `admin123`)

**Or if you didn't set environment variables:**
- Email: `admin@example.com`
- Password: `admin123`

## Check Existing Admins

To see what admin accounts exist in your database:

```bash
npm run check-admin
# or
node scripts/check-admin.js
```

This will show you:
- All admin email addresses
- Admin names
- Creation dates

**Note:** Passwords are hashed and cannot be displayed.

## Create New Admin

To create a new admin user:

```bash
# Using npm script
npm run create-admin

# Or directly
node scripts/create-admin.js
```

You can set environment variables before running:
```bash
ADMIN_EMAIL=your-email@example.com ADMIN_PASSWORD=your-password npm run create-admin
```

Or add to your `.env` file:
```env
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-password
ADMIN_NAME=Your Name
```

## Reset Admin Password

If you forgot your password:

```bash
npm run reset-admin
# or
node scripts/reset-admin-password.js
```

This will prompt you to:
1. Enter the admin email
2. Enter new password
3. Confirm new password

## Troubleshooting

### "No admin users found"
- Run `npm run create-admin` to create one
- Make sure MongoDB is running and connected

### "Invalid email or password"
- Check that you're using the correct email (case-insensitive)
- Verify the password is correct
- Try resetting the password with `npm run reset-admin`

### "MongoDB connection error"
- Make sure MongoDB is running: `mongod`
- Check your `MONGODB_URI` in `.env` file
- For MongoDB Atlas, verify connection string is correct

### Can't remember credentials
1. Run `npm run check-admin` to see admin emails
2. Run `npm run reset-admin` to reset password for that email

## Quick Start

1. **First time setup:**
   ```bash
   # Make sure MongoDB is running
   # Then create admin
   npm run create-admin
   ```

2. **Login:**
   - Go to http://localhost:3000/login
   - Use credentials from step 1

3. **If you forgot password:**
   ```bash
   npm run reset-admin
   ```

## Security Note

⚠️ **Change default passwords immediately in production!**

The default password `admin123` is only for development. In production:
- Use strong passwords (12+ characters, mixed case, numbers, symbols)
- Don't commit `.env` file to git
- Use environment-specific credentials









