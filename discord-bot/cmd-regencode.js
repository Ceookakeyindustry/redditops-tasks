const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, updateTask, addActionLog } = require('../utils/supabase');

// Match the website's generateAccessCode in src/lib/types.ts
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regencode')
    .setDescription('Generate a new access code for a task without changing the assignment')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true)),

  async execute(interaction, { client }) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const task = await getTask(taskId);

    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    if (task.status !== 'assigned') {
      return interaction.editReply(
        `❌ Task **${taskId}** is not currently assigned. Only assigned tasks need code regeneration. ` +
        `Current status: **${task.status}**.`
      );
    }

    const newCode = generateAccessCode();

    // Don't change status or assignment - just update the code
    await updateTask(taskId, {
      accessCode: newCode,
      accessCodeDisabled: false,
    });

    await addActionLog(
      taskId,
      'access_code_regenerated',
      interaction.user.tag,
      { regenerated: true }
    );

    // DM the assigned user with the new code
    const websiteUrl = process.env.WEBSITE_URL || 'https://redditops.example.com';
    const codeDisplay = newCode;

    if (task.discordUserId) {
      try {
        const user = await client.users.fetch(task.discordUserId);
        if (user) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x8B5CF6)
            .setTitle('🔄 Access Code Regenerated')
            .setDescription(`Your access code for **${taskId}** has been updated by an admin.`)
            .addFields(
              { name: 'Task', value: `${taskId} - ${task.title}`, inline: true },
              { name: 'Website', value: `${websiteUrl}/task/${taskId}`, inline: false },
              { name: 'New Access Code', value: `\`\`\`\n${codeDisplay}\n\`\`\``, inline: false },
              { name: '⏰ Expires', value: task.expiresAt 
                ? new Date(task.expiresAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })
                : 'Unknown', 
                inline: false },
            )
            .setFooter({ text: 'Your previous access code is no longer valid.' })
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        }
      } catch (dmError) {
        console.warn(`⚠️ Could not DM user: ${dmError.message}`);
        return interaction.editReply(
          `✅ Access code regenerated for **${taskId}**, but could not DM the user.\n\n` +
          `**New Access Code:** ||${codeDisplay}||`
        );
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('🔄 Access Code Regenerated')
      .addFields(
        { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
        { name: 'Assigned To', value: task.assignedDiscordUsername || 'Unknown', inline: true },
        { name: 'New Code', value: `||${codeDisplay}||`, inline: false },
      )
      .setFooter({ text: 'The user has been notified via DM with the new code.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
