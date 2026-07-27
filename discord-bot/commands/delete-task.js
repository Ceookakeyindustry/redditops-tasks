const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, deleteTask, addActionLog } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-task')
    .setDescription('Permanently delete a task and all its submissions')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID to delete (e.g., ROT-001)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('confirm')
        .setDescription('Type "YES" to confirm deletion')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const confirm = interaction.options.getString('confirm');

    if (confirm !== 'YES') {
      return interaction.editReply(
        `❌ Deletion cancelled. Type \`YES\` (all caps) to confirm deletion of **${taskId}**.`
      );
    }

    const task = await getTask(taskId);
    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    const success = await deleteTask(taskId);
    if (!success) {
      return interaction.editReply(`❌ Failed to delete task **${taskId}**.`);
    }

    // Notify log channel
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (logChannelId) {
      try {
        const channel = await interaction.client.channels.fetch(logChannelId);
        if (channel) {
          await channel.send(
            `🗑️ **Task Deleted**\n**${taskId}** - ${task.title}\nDeleted by: ${interaction.user.tag}`
          );
        }
      } catch (e) {}
    }

    const embed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('🗑️ Task Deleted')
      .addFields(
        { name: 'Task ID', value: taskId, inline: true },
        { name: 'Title', value: task.title, inline: true },
        { name: 'Deleted By', value: interaction.user.tag, inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
