const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getAllTasks } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tasks')
    .setDescription('View all tasks (paginated)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tasks = await getAllTasks();
    const itemsPerPage = 8;

    if (tasks.length === 0) {
      return interaction.editReply('📭 No tasks found.');
    }

    const totalPages = Math.ceil(tasks.length / itemsPerPage);
    let currentPage = 0;

    function buildEmbed(page) {
      const startIdx = page * itemsPerPage;
      const pageTasks = tasks.slice(startIdx, startIdx + itemsPerPage);

      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('📋 All Tasks')
        .setDescription(`Total: ${tasks.length} tasks | Page ${page + 1}/${totalPages}`)
        .setTimestamp();

      for (const task of pageTasks) {
        const statusEmoji = {
          available: '🟢',
          assigned: '🔵',
          submitted: '🟡',
          approved: '✅',
          expired: '🔴',
        }[task.status] || '⚪';

        const createdDate = task.createdAt
          ? `<t:${Math.floor(new Date(task.createdAt).getTime() / 1000)}:d>`
          : 'Unknown';

        embed.addFields({
          name: `${statusEmoji} ${task.taskId} - ${task.title}`,
          value: `Type: ${task.type === 'comment' ? '💬 Comment' : '📄 Post'}\n` +
                 `Status: **${task.status}** | Assigned: ${task.assignedDiscordUsername || 'Nobody'}\n` +
                 `Created: ${createdDate} | 💰 $${parseFloat(task.payment).toFixed(2)}`,
          inline: false,
        });
      }

      return embed;
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage >= totalPages - 1),
      );

    const message = await interaction.editReply({
      embeds: [buildEmbed(0)],
      components: totalPages > 1 ? [row] : [],
    });

    if (totalPages <= 1) return;

    const filter = i => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on('collect', async i => {
      if (i.customId === 'prev' && currentPage > 0) {
        currentPage--;
      } else if (i.customId === 'next' && currentPage < totalPages - 1) {
        currentPage++;
      }

      const newRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages - 1),
        );

      await i.update({
        embeds: [buildEmbed(currentPage)],
        components: [newRow],
      });
    });

    collector.on('end', async () => {
      try {
        await message.edit({ components: [] });
      } catch {}
    });
  },
};
