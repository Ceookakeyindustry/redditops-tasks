require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.log(`⚠️  Skipped ${file} - missing "data" property`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!clientId || !guildId) {
      console.error('❌ DISCORD_CLIENT_ID and DISCORD_GUILD_ID must be set in .env');
      process.exit(1);
    }

    console.log(`🔄 Registering ${commands.length} slash commands...`);

    // Register guild-specific commands (instant updates)
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`✅ Successfully registered ${data.length} slash commands for guild ${guildId}`);
    console.log('\nCommands registered:');
    commands.forEach(cmd => {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    });
    console.log('\n💡 To make commands global (can take up to 1 hour), change to Routes.applicationCommands(clientId)');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
