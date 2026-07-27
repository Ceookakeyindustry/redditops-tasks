const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, getTaskSubmissions } = require('../utils/supabase');

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
    .setName('submissions')
    .setDescription('View all submissions for a task')
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

    const submissions = await getTaskSubmissions(taskId);

    if (submissions.length === 0) {
      return interaction.editReply(`📭 No submissions found for **${taskId}**.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`📋 Submissions for ${taskId}`)
      .setDescription(`${task.title} — ${submissions.length} submission(s)`)
      .setTimestamp();

    for (const sub of submissions.slice(0, 5)) {
      const status = statusLabels[sub.status] || sub.status;
      const screenshots = sub.screenshots?.length || 0;
      embed.addFields({
        name: `${status}`,
        value: `**Ref:** ${sub.refId}\\n` +
               `**Worker:** ${sub.discordUsername}\\n` +
               `**Submitted:** <t:${Math.floor(new Date(sub.submittedAt).getTime() / 1000)}:R>\\n` +
               `**Screenshots:** ${screenshots} | **Link:** [View](${sub.proofLink})` +
               (sub.rejectionReason ? `\\n**Rejected:** ${sub.rejectionReason}` : ''),
        inline: false,
      });
    }

    if (submissions.length > 5) {
      embed.setFooter({ text: `Showing 5 of ${submissions.length} submissions` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
