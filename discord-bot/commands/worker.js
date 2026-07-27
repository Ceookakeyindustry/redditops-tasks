const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllTasks, getAllSubmissions, getPaymentMethodByUsername } = require('../utils/supabase');

const statusLabels = {
  submitted: '📝 Submitted',
  in_review: '🔍 In Review',
  '24hr_pending': '⏳ 24hr Pending',
  '24hr_done': '✅ 24hr Done',
  '48hr_pending': '⏳ 48hr Pending',
  '48hr_done': '✅ 48hr Done',
  processing: '⚙️ Processing',
  paid: '💰 Paid',
  rejected: '❌ Rejected',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worker')
    .setDescription('Look up worker info, payment details, and submissions')
    .addStringOption(option =>
      option.setName('discord_username')
        .setDescription("Worker's Discord username")
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString('discord_username');

    const [tasks, submissions, paymentMethod] = await Promise.all([
      getAllTasks(),
      getAllSubmissions(),
      getPaymentMethodByUsername(username),
    ]);

    // Find tasks assigned to this worker
    const assignedTasks = tasks.filter(t =>
      t.assignedDiscordUsername?.toLowerCase() === username.toLowerCase()
    );

    // Find submissions by this worker
    const workerSubs = submissions.filter(s =>
      s.discordUsername?.toLowerCase() === username.toLowerCase()
    );

    const totalPaid = workerSubs
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + parseFloat(s.payment), 0);

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`👤 Worker Info: ${username}`)
      .setTimestamp();

    // Payment Info
    const paymentInfo = paymentMethod
      ? `**Method:** ${paymentMethod.methodType}\\n**Details:** ||${paymentMethod.methodDetails}||`
      : '❌ No payment method set';

    // Stats
    embed.addFields(
      { name: '📊 Stats', value:
        `Tasks Assigned: **${assignedTasks.length}**\\n` +
        `Submissions: **${workerSubs.length}**\\n` +
        `Paid: **${workerSubs.filter(s => s.status === 'paid').length}**\\n` +
        `Total Earned: **$${totalPaid.toFixed(2)}**`, inline: false },
      { name: '💳 Payment Method', value: paymentInfo, inline: false },
    );

    // Recent submissions
    if (workerSubs.length > 0) {
      const recentSubs = workerSubs.slice(0, 3);
      const subText = recentSubs.map(s => {
        const time = s.submittedAt
          ? `<t:${Math.floor(new Date(s.submittedAt).getTime() / 1000)}:R>`
          : 'Unknown';
        return `${statusLabels[s.status] || s.status} — **${s.taskId}** — ${time}`;
      }).join('\n');

      embed.addFields({ name: '📝 Recent Submissions', value: subText, inline: false });
    }

    // Currently assigned tasks
    const activeAssigned = assignedTasks.filter(t => t.status === 'assigned');
    if (activeAssigned.length > 0) {
      const taskText = activeAssigned.map(t => {
        const expiry = t.expiresAt
          ? `<t:${Math.floor(new Date(t.expiresAt).getTime() / 1000)}:R>`
          : 'No expiry';
        return `**${t.taskId}** — ${t.title} — Expires: ${expiry}`;
      }).join('\n');

      embed.addFields({ name: '⏳ Currently Assigned', value: taskText, inline: false });
    }

    if (workerSubs.length === 0 && assignedTasks.length === 0) {
      embed.setDescription('No submissions or assigned tasks found for this worker.');
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
