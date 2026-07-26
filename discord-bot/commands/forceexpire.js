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
    .setName('forceexpire')
    .setDescription('Immediately expire an assigned task')
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
        `❌ Task **${taskId}** is not currently assigned. Current status: **${task.status}**.`
      );
    }

    const previousUser = task.assignedDiscordUsername;
    const newCode = generateAccessCode();

    await updateTask(taskId, {
      accessCode: newCode,
      accessCodeDisabled: false,
      status: 'available',
      discordUserId: null,
      assignedDiscordUsername: null,
      assignedAt: null,
      expiresAt: null,
    });

    await addActionLog(
      taskId,
      'expired',
      interaction.user.tag,
      { previouslyAssignedTo: previousUser, forced: true }
    );

    // DM the previously assigned worker
    if (task.discordUserId) {
      try {
        const user = await client.users.fetch(task.discordUserId);
        if (user) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xEF4444)
            .setTitle('⏰ Task Expired (Forced)')
            .setDescription(`Your assigned task **${taskId}** has been force-expired by an admin.`)
            .addFields(
              { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
            )
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        }
      } catch (dmError) {
        console.warn(`⚠️ Could not DM user: ${dmError.message}`);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('⏰ Task Force-Expired')
      .addFields(
        { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
        { name: 'Previously Assigned To', value: previousUser || 'Unknown', inline: true },
        { name: 'New Status', value: 'Available', inline: true },
      )
      .setFooter({ text: 'A new access code has been generated.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
