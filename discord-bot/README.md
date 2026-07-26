# RedditOps Discord Bot

The official Discord bot for managing RedditOps Tasks. Integrates with the RedditOps Tasks website and Supabase database.

## Features

- **Task Assignment**: Assign tasks to Discord users via `/assign`
- **Task Unassignment**: Remove assignments with `/unassign`
- **Submission Review**: Approve or reject submissions with `/approve` and `/reject`
- **Access Code Management**: Generate new access codes with `/regencode`
- **Force Expiry**: Immediately expire tasks with `/forceexpire`
- **Task Listing**: View all tasks or tasks created today
- **Automatic Expiry**: Tasks automatically expire after 12 hours if not submitted
- **DM Notifications**: Users receive DMs when assigned, approved, rejected, or expired

## Prerequisites

- Node.js 18+ installed
- A Discord Bot Token (from Discord Developer Portal)
- A Supabase project (free tier)
- Admin role in your Discord server

## Setup Instructions

### 1. Create a Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name (e.g., "RedditOps Tasks")
3. Go to the "Bot" tab
4. Click "Add Bot" and confirm
5. Under "Token", click "Reset Token" and copy the token (save it for later)
6. Under "Privileged Gateway Intents", enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
7. Go to the "OAuth2" → "URL Generator" tab
8. Check "bot" and "applications.commands" scopes
9. Check these permissions:
   - Send Messages
   - Read Messages/View Channels
   - Use Slash Commands
   - Manage Messages (optional, for cleanups)
10. Copy the generated URL and open it in your browser to invite the bot to your server
11. Make sure the bot has access to your Discord server

### 2. Create a Discord Admin Role

1. In your Discord server, go to Server Settings → Roles
2. Create a new role called "Admin" (or any name you prefer)
3. Right-click the role and select "Copy ID" (Developer Mode must be enabled in Discord settings → Advanced → Developer Mode)
4. Save this role ID for the `.env` file

### 3. Supabase Setup

1. Go to https://supabase.com and create a project (free tier is fine)
2. Run the SQL from `supabase-schema.sql` in the Supabase SQL Editor
3. Go to Project Settings → API
4. Copy your "Project URL" and "Service Role Key" (not the anon key!)
   - **IMPORTANT**: Use the `service_role` key, NOT the `anon` public key

### 4. Google Sheets Setup (Optional)

If you want submissions synced to Google Sheets:

1. Go to https://console.cloud.google.com
2. Create a project or use existing one
3. Enable the Google Sheets API
4. Create a Service Account and download the JSON key
5. Share your Google Sheet with the service account email (viewer/edit)
6. Copy the Spreadsheet ID from your Google Sheet URL

### 5. Configure the Bot

1. Navigate to the bot directory:
```bash
cd discord-bot
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
copy .env.example .env
```

4. Edit the `.env` file with your configuration:
```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_server_id_here
ADMIN_ROLE_ID=your_admin_role_id_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
WEBSITE_URL=https://your-website.vercel.app
```

### 6. Register Slash Commands

Run the command registration script once:
```bash
npm run register
```

You should see: "✅ Successfully registered X slash commands"

### 7. Start the Bot

```bash
npm start
```

Or for development:
```bash
node index.js
```

The bot will stay online as long as the terminal is open. To keep it running 24/7:

- **On your PC**: Minimize the terminal window; it will run in the background
- **On a VPS**: Use `pm2` or `screen` to keep it running:
```bash
npm install -g pm2
pm2 start index.js --name redditops-bot
pm2 save
```

## Available Commands

### Admin Commands (Require Admin Role)

| Command | Description | Example |
|---------|-------------|---------|
| `/assign <task_id> @user` | Assign a task to a Discord user | `/assign ROT-001 @John` |
| `/unassign <task_id>` | Remove assignment, make task available | `/unassign ROT-001` |
| `/approve <task_id>` | Approve a submitted task | `/approve ROT-001` |
| `/reject <task_id> <reason>` | Reject a submission with reason | `/reject ROT-001 Wrong subreddit` |
| `/forceexpire <task_id>` | Immediately expire a task | `/forceexpire ROT-001` |
| `/regencode <task_id>` | Generate a new access code | `/regencode ROT-001` |

### View Commands (Everyone)

| Command | Description |
|---------|-------------|
| `/today` | View all tasks created today |
| `/tasks` | View all tasks (paginated) |
| `/task <task_id>` | View full details of a specific task |

## How It Works

1. **Admin creates a task** on the website
2. **Admin uses `/assign`** in Discord to assign the task to a user
3. **Bot generates** a unique access code and DMs it to the user
4. **User visits** the website, enters Task ID + Access Code
5. **User completes** the task and submits proof
6. **Admin reviews** and uses `/approve` or `/reject`
7. If no submission within **12 hours**, the bot auto-expires the task

## Security

- Access codes are never shown publicly (only via DM, spoiler-tagged in admin responses)
- Every assignment generates a fresh random access code
- Expired/rejected tasks automatically invalidate old codes
- Only the currently assigned user can use the active access code
- All actions are logged with timestamps
- Admin commands require a specific Discord role

## Troubleshooting

**Bot doesn't respond to commands:**
- Make sure the bot is online (green dot)
- Run `npm run register` to re-register commands
- Check Discord Developer Portal for correct intents

**Can't DM users:**
- Users need to enable "Allow direct messages from server members" in Discord privacy settings
- The bot and user must be in the same server

**Supabase errors:**
- Check your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Make sure the SQL schema has been applied
- The service role key bypasses RLS, so make sure it's correct

**Google Sheets not working:**
- Verify the service account email has access to the sheet
- Check the private key format (use actual newlines, not `\n`)
- This is optional — the bot works without it
