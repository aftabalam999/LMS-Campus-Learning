# Dual Firebase Project Deployment Guide

This project is configured to deploy to two Firebase projects simultaneously for redundancy and multi-environment support.

## Projects

### Primary Project (Production)
- **Project Name**: `dharamshalacampus`
- **Project ID**: `dharamshalacampus`
- **Hosting URL**: https://dharamshalacampus.web.app
- **Firebase Console**: https://console.firebase.google.com/project/dharamshalacampus/overview

### Secondary Project
- **Project Name**: `campuslearning`
- **Project ID**: `campuslearnings`
- **Project Number**: `59924405245`
- **Parent Organization**: `navgurukul.org`
- **Web API Key**: `AIzaSyC5RiENlPdKYX55FcDHWBNUr0qkrdw1clM`
- **Hosting URL**: https://campuslearnings.web.app
- **Firebase Console**: https://console.firebase.google.com/project/campuslearnings/overview

Both projects have identical functionality and can be used interchangeably.

## Deployment Commands

### Deploy to Both Projects
```bash
npm run deploy:all
```

This will:
1. Build with production config and deploy to `dharamshalacampus` (hosting + Firestore rules/indexes)
2. Build with secondary config and deploy to `campuslearnings` (hosting + Firestore rules/indexes)

### Deploy to Individual Projects
```bash
# Deploy only to production
npm run deploy:production

# Deploy only to secondary
npm run deploy:secondary
```

### Manual Deployment
```bash
# Switch to production project
firebase use default
npm run build:production
firebase deploy

# Switch to secondary project
firebase use secondary
npm run build:secondary
firebase deploy
```

**Note**: `firebase deploy` deploys hosting, Firestore rules, and indexes by default.

## What Gets Deployed

Each deployment includes:
- **Hosting**: Built React application files
- **Firestore Rules**: Security rules from `firestore.rules`
- **Firestore Indexes**: Index configurations from `firestore.indexes.json`

### Firestore Rules
Current rules allow authenticated users to read/write all data:
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Security Note**: Access control is handled at the application level based on user roles.

## Environment Configuration

- `.env.production` - Configuration for primary project
- `.env.secondary` - Configuration for secondary project
- Build scripts automatically copy the correct `.env` file before building

## Authentication Setup

### Authorized Domains
Both Firebase projects require domain authorization for OAuth operations:

#### Primary Project (`dharamshalacampus`)
1. Go to: https://console.firebase.google.com/project/dharamshalacampus/authentication/settings
2. Add to **Authorized domains**: `dharamshalacampus.web.app`

#### Secondary Project (`campuslearnings`)
1. Go to: https://console.firebase.google.com/project/campuslearnings/authentication/settings
2. Add to **Authorized domains**: `campuslearnings.web.app`

**Note**: Wait 5-10 minutes after adding domains before testing authentication.

## Firebase CLI Setup

The `.firebaserc` file contains both projects:
```json
{
  "projects": {
    "default": "dharamshalacampus",
    "secondary": "campuslearnings"
  }
}
```

### Switching Between Projects
```bash
# Switch to production project
firebase use default

# Switch to secondary project
firebase use secondary

# Check current project
firebase use
```

## Important Notes

- Always use `npm run deploy:all` for complete deployment to both projects
- Each project has its own Firestore database and user data
- Both projects share the same codebase but use different Firebase configurations
- Monitor both projects for usage and costs

### Data Isolation
- User authentication is separate between projects
- Data does not sync between projects automatically
- Use the appropriate project URL for the data you want to access

### Security
- Keep API keys and service account credentials secure
- Regularly rotate keys if needed
- Monitor Firebase project access logs

### Development
- Use `localhost` for local development (should be authorized by default)
- Test features on secondary project before production deployment
- Keep both projects updated with the same codebase

## Troubleshooting

If deployment fails:
1. Check that you're logged into Firebase CLI: `firebase login`
2. Verify project aliases: `firebase projects:list`
3. Ensure environment files exist and contain correct values
4. Check Firebase project permissions