const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, getTaskSubmission, updateTask, addActionLog, getSupabase } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Change the status of a task/submission through the pipeline')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('new_status')
        .setDescription('New status for the submission')
        .setRequired(true)
        .addChoices(
          { name: 'Submitted', value: 'submitted' },
          { name: 'In Review', value: 'in_review' },
          { name: '24hr Screen Pending', value: '24hr_pending' },
          { name: '24hr Screen Done', value: '24hr_done' },
          { name: '48hr Screen Pending', value: '48hr_pending' },
          { name: '48hr Screen Done', value: '48hr_done' },
          { name: 'Processing Payment', value: 'processing' },
          { name: 'Paid', value: 'paid' },
          { name: 'Rejected', value: 'rejected' },
        )),

  async execute(interaction, { client }) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const newStatus = interaction.options.getString('new_status');

    const task = await getTask(taskId);

    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    // Get the submission if exists
    const submission = await getTaskSubmission(taskId);

    // If rejecting, reset the task to available
    if (newStatus === 'rejected') {
      const previousUser = task.assignedDiscordUsername;

      await updateTask(taskId, {
        accessCode: generateAccessCode(),
        accessCodeDisabled: false,
        status: 'available',
        discordUserId: null,
        assignedDiscordUsername: null,
        assignedAt: null,
        expiresAt: null,
      });

      // Log the action
      await addActionLog(
        taskId,
        'rejected',
        interaction.user.tag,
        { reason: 'Status changed via /status command', previouslyAssignedTo: previousUser }
      );

      // DM the worker
      if (task.discordUserId) {
        try {
          const user = await client.users.fetch(task.discordUserId);
          if (user) {
            const dmEmbed = new EmbedBuilder()
              .setColor(0xEF4444)
              .setTitle('❌ Submission Rejected')
              .setDescription(`Your submission for **${taskId}** has been rejected.`)
              .addFields(
                { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
                { name: 'Status', value: 'Rejected by admin via Discord', inline: false },
              )
              .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
          }
        } catch (dmError) {
          console.warn(`⚠️ Could not DM user: ${dmError.message}`);
        }
      }
    } else if (newStatus === 'paid') {
      // Mark as paid - set task to approved for backward compat
      await updateTask(taskId, { status: 'approved' });

      await addActionLog(
        taskId,
        'paid',
        interaction.user.tag,
        { newStatus }
      );

      // DM the worker
      if (task.discordUserId) {
        try {
          const user = await client.users.fetch(task.discordUserId);
          if (user) {
            const dmEmbed = new EmbedBuilder()
              .setColor(0x10B981)
              .setTitle('✅ Payment Completed')
              .setDescription(`Payment for **${taskId}** has been processed.`)
              .addFields(
                { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
                { name: 'Amount', value: `$${parseFloat(task.payment).toFixed(2)}`, inline: true },
              )
              .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
          }
        } catch (dmError) {
          console.warn(`⚠️ Could not DM user: ${dmError.message}`);
        }
      }
    } else {
      // For other status changes, just log it
      await addActionLog(
        taskId,
        `status_${newStatus}`,
        interaction.user.tag,
        { previousStatus: task.status, newStatus }
      );
    }

    // Update the submission status in Supabase
    const supabase = getSupabase();
    if (supabase && submission) {
      await supabase
        .from('submissions')
        .update({ status: newStatus })
        .eq('ref_id', submission.refId);
    }

    // Status labels for display
    const statusLabels = {
      submitted: '📝 Submitted',
      in_review: '🔍 In Review',
      '24hr_pending': '⏳ 24hr Screen Pending',
      '24hr_done': '✅ 24hr Screen Done',
      '48hr_pending': '⏳ 48hr Screen Pending',
      '48hr_done': '✅ 48hr Screen Done',
      processing: '⚙️ Processing',
      paid: '💰 Paid',
      rejected: '❌ Rejected',
    };

    const statusColors = {
      submitted: 0xF59E0B,
      in_review: 0x3B82F6,
      '24hr_pending': 0xF59E0B,
      '24hr_done': 0x10B981,
      '48hr_pending': 0xF59E0B,
      '48hr_done': 0x10B981,
      processing: 0x8B5CF6,
      paid: 0x10B981,
      rejected: 0xEF4444,
    };

    const embed = new EmbedBuilder()
      .setColor(statusColors[newStatus] || 0x8B5CF6)
      .setTitle(`${statusLabels[newStatus] || newStatus}`)
      .addFields(
        { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
        { name: 'Previous Status', value: task.status || 'N/A', inline: true },
        { name: 'New Status', value: statusLabels[newStatus] || newStatus, inline: true },
      )
      .setFooter({ text: `Updated by ${interaction.user.tag}` })
      .setTimestamp();

    // Notify log channel
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (logChannelId) {
      try {
        const channel = await interaction.client.channels.fetch(logChannelId);
        if (channel) {
          await channel.send(
            `**${statusLabels[newStatus] || newStatus}**\\n**${taskId}** - ${task.title}\\nBy: ${interaction.user.tag}\\nPrevious: ${task.status} → New: ${newStatus}`
          );
        }
      } catch (e) {}
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

// Helper to generate access code (same as website)
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
