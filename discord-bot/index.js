require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const { getSupabase } = require('./utils/supabase');
const { startExpiryChecker } = require('./utils/expiry');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Command collection
client.commands = new Collection();

// Load command files
const fs = require('fs');
const path = require('path');
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.log(`⚠️  Command ${file} is missing "data" or "execute" property.`);
  }
}

// Verify admin role
function isAdmin(member) {
  if (!member) return false;
  const adminRoleId = process.env.ADMIN_ROLE_ID;
  if (!adminRoleId) {
    console.warn('⚠️  ADMIN_ROLE_ID not set. Allowing all commands for now.');
    return true;
  }
  return member.roles.cache.has(adminRoleId);
}

// Interaction handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Check admin permissions for admin commands
  const adminCommands = ['assign', 'unassign', 'approve', 'reject', 'forceexpire', 'regencode', 'status'];
  if (adminCommands.includes(interaction.commandName)) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command. Admin role required.',
        ephemeral: true,
      });
    }
  }

  try {
    await command.execute(interaction, { client, isAdmin });
  } catch (error) {
    console.error(`❌ Error executing /${interaction.commandName}:`, error);
    const reply = {
      content: '❌ An error occurred while executing this command.',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Ready event
client.once(Events.ClientReady, async c => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  // Verify Supabase connection
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('tasks').select('task_id').limit(1);
    if (error) {
      console.warn(`⚠️  Supabase connection issue: ${error.message}`);
    } else {
      console.log('✅ Supabase connected');
    }
  } else {
    console.warn('⚠️  Supabase not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  // Start the expiry checker
  startExpiryChecker(client);
  console.log('✅ Expiry checker started (runs every 5 minutes)');
  console.log(`✅ Bot is ready! Admin commands require role ID: ${process.env.ADMIN_ROLE_ID || 'NOT SET'}`);
});

// Error handling
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Login
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN is not set in .env file');
  process.exit(1);
}

client.login(token);
