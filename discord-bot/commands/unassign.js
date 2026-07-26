const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, updateTask, addActionLog } = require('../utils/supabase');

function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.substring(0, 4) + '-' + code.substring(4);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unassign')
    .setDescription('Remove the current assignment and return the task to the available pool')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true)),

  async execute(interaction) {
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
      'unassigned',
      interaction.user.tag,
      { previouslyAssignedTo: previousUser }
    );

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('🔄 Task Unassigned')
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
