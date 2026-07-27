const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, getActionLogs } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('actions')
    .setDescription('View action history/logs for a task')
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

    const logs = await getActionLogs(taskId);

    if (logs.length === 0) {
      return interaction.editReply(`📭 No action logs found for **${taskId}**.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`📜 Action Logs for ${taskId}`)
      .setDescription(`${task.title} — ${logs.length} action(s)`)
      .setTimestamp();

    const actionEmojis = {
      assigned: '📋',
      unassigned: '♻️',
      submitted: '📝',
      approved: '✅',
      rejected: '❌',
      expired: '⏰',
      paid: '💰',
      access_code_regenerated: '🔑',
      status_in_review: '🔍',
      status_24hr_pending: '⏳',
      status_24hr_done: '✅',
      status_48hr_pending: '⏳',
      status_48hr_done: '✅',
      status_processing: '⚙️',
      status_paid: '💰',
    };

    for (const log of logs.slice(0, 8)) {
      const emoji = actionEmojis[log.action] || '📌';
      const time = log.created_at
        ? `<t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`
        : 'Unknown';

      embed.addFields({
        name: `${emoji} ${log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        value: `By: **${log.performed_by}** — ${time}` +
               (log.details?.reason ? `\\nReason: ${log.details.reason}` : '') +
               (log.details?.previouslyAssignedTo ? `\\nWorker: ${log.details.previouslyAssignedTo}` : ''),
        inline: false,
      });
    }

    if (logs.length > 8) {
      embed.setFooter({ text: `Showing 8 of ${logs.length} logs` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
