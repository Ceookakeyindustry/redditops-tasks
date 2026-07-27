const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTodayTasks } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('today')
    .setDescription('View all tasks created today'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tasks = await getTodayTasks();

    if (tasks.length === 0) {
      return interaction.editReply('📭 No tasks were created today.');
    }

    const embeds = [];
    const tasksPerPage = 5;
    const totalPages = Math.ceil(tasks.length / tasksPerPage);

    for (let page = 0; page < totalPages; page++) {
      const startIdx = page * tasksPerPage;
      const pageTasks = tasks.slice(startIdx, startIdx + tasksPerPage);

      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle(`📋 Today's Tasks`)
        .setDescription(`Total: ${tasks.length} task(s) created today`)
        .setFooter({ text: `Page ${page + 1}/${totalPages}` })
        .setTimestamp();

      for (const task of pageTasks) {
        const statusEmoji = {
          available: '🟢',
          assigned: '🔵',
          submitted: '🟡',
          approved: '✅',
          expired: '🔴',
        }[task.status] || '⚪';

        const assignedTo = task.assignedDiscordUsername || 'Nobody';
        const timeRemaining = task.expiresAt
          ? `\n⏰ Expires: <t:${Math.floor(new Date(task.expiresAt).getTime() / 1000)}:R>`
          : '';

        embed.addFields({
          name: `${statusEmoji} ${task.taskId} - ${task.title}`,
          value: `Type: ${task.type === 'comment' ? '💬 Comment' : '📄 Post'}\n` +
                 `Assigned To: ${assignedTo}\n` +
                 `Status: **${task.status}**${timeRemaining}\n` +
                 `💰 $${parseFloat(task.payment).toFixed(2)}`,
          inline: false,
        });
      }

      embeds.push(embed);
    }

    await interaction.editReply({ embeds });
  },
};
