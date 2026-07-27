const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllTasks, getAllSubmissions } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View server statistics and dashboard'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const [tasks, submissions] = await Promise.all([getAllTasks(), getAllSubmissions()]);

    const availableTasks = tasks.filter(t => t.status === 'available');
    const assignedTasks = tasks.filter(t => t.status === 'assigned');
    const paidSubs = submissions.filter(s => s.status === 'paid');
    const rejectedSubs = submissions.filter(s => s.status === 'rejected');
    const inProgress = submissions.filter(s =>
      ['submitted', 'in_review', '24hr_pending', '24hr_done', '48hr_pending', '48hr_done', 'processing'].includes(s.status)
    );
    const totalPayout = paidSubs.reduce((sum, s) => sum + parseFloat(s.payment), 0);

    const statusCounts = {
      submitted: submissions.filter(s => s.status === 'submitted').length,
      in_review: submissions.filter(s => s.status === 'in_review').length,
      '24hr_pending': submissions.filter(s => s.status === '24hr_pending').length,
      '24hr_done': submissions.filter(s => s.status === '24hr_done').length,
      '48hr_pending': submissions.filter(s => s.status === '48hr_pending').length,
      '48hr_done': submissions.filter(s => s.status === '48hr_done').length,
      processing: submissions.filter(s => s.status === 'processing').length,
    };

    const statusText = Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => {
        const labels = {
          submitted: '📝 Submitted',
          in_review: '🔍 In Review',
          '24hr_pending': '⏳ 24hr Pending',
          '24hr_done': '✅ 24hr Done',
          '48hr_pending': '⏳ 48hr Pending',
          '48hr_done': '✅ 48hr Done',
          processing: '⚙️ Processing',
        };
        return `${labels[status] || status}: **${count}**`;
      })
      .join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('📊 Bot Dashboard')
      .setDescription('Server statistics at a glance')
      .addFields(
        { name: '📋 Tasks', value: `Total: **${tasks.length}**\\nAvailable: **${availableTasks.length}**\\nAssigned: **${assignedTasks.length}**`, inline: true },
        { name: '📝 Submissions', value: `Total: **${submissions.length}**\\nIn Progress: **${inProgress.length}**\\nPaid: **${paidSubs.length}**\\nRejected: **${rejectedSubs.length}**`, inline: true },
        { name: '💰 Payout', value: `Total Paid: **$${totalPayout.toFixed(2)}**`, inline: false },
        { name: '📊 Pipeline Status', value: statusText || 'No active submissions', inline: false },
      )
      .setFooter({ text: `Last updated` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
