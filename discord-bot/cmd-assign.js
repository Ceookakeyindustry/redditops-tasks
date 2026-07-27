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
    .setName('assign')
    .setDescription('Assign a task to a Discord user')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The Discord user to assign this task to')
        .setRequired(true)),

  async execute(interaction, { client }) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const targetUser = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(targetUser.id);

    // Fetch the task
    const task = await getTask(taskId);

    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    if (task.status !== 'available') {
      return interaction.editReply(
        `❌ Task **${taskId}** is not available. Current status: **${task.status}**. ` +
        `Use /unassign first if needed.`
      );
    }

    // Generate new access code
    const accessCode = generateAccessCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours

    // Update task in Supabase
    const updated = await updateTask(taskId, {
      accessCode,
      accessCodeDisabled: false,
      status: 'assigned',
      discordUserId: targetUser.id,
      assignedDiscordUsername: targetUser.username,
      assignedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    if (!updated) {
      return interaction.editReply(`❌ Failed to update task ${taskId}.`);
    }

    // Log the action
    await addActionLog(
      taskId,
      'assigned',
      interaction.user.tag,
      {
        discordUserId: targetUser.id,
        discordUsername: targetUser.username,
        expiresAt: expiresAt.toISOString(),
      }
    );

    const codeDisplay = accessCode;
    const websiteUrl = process.env.WEBSITE_URL || 'https://redditops.example.com';
    const expiryTimeStr = expiresAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // DM the assigned user
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('📋 New RedditOps Task Assigned')
        .setDescription(`A task has been reserved exclusively for you.`)
        .addFields(
          { name: 'Task ID', value: taskId, inline: true },
          { name: 'Title', value: task.title, inline: true },
          { name: 'Payment', value: `$${parseFloat(task.payment).toFixed(2)}`, inline: true },
          { name: 'Website', value: `${websiteUrl}/task/${taskId}` },
          { name: 'Access Code', value: `\`\`\`\n${codeDisplay}\n\`\`\`` },
          { name: '⏰ Expires', value: expiryTimeStr, inline: true },
          { name: '📌 Status', value: 'You have **12 hours** to complete and submit this task.', inline: false },
        )
        .setFooter({ text: 'Do not share your access code. It is unique to you.' })
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
      console.log(`📧 DM sent to ${targetUser.tag} for task ${taskId}`);
    } catch (dmError) {
      console.warn(`⚠️ Could not DM ${targetUser.tag}: ${dmError.message}`);
      return interaction.editReply(
        `❌ Task **${taskId}** assigned, but could not DM **${targetUser.username}**. ` +
        `They may have DMs disabled. Ask them to enable DMs from server members.\n\n` +
        `**Access Code:** ||${codeDisplay}||`
      );
    }

    // Success response to admin
    const successEmbed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle('✅ Task Assigned Successfully')
      .addFields(
        { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
        { name: 'Assigned To', value: `${targetUser} (${targetUser.tag})`, inline: true },
        { name: 'Expires At', value: expiryTimeStr, inline: true },
        { name: 'Access Code', value: `||${codeDisplay}||`, inline: false },
      )
      .setFooter({ text: 'The user has been notified via DM.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
  },
};
