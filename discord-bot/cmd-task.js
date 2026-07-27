const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, getTaskSubmission } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task')
    .setDescription('View full details of a specific task')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true)),

  async execute(interaction, { isAdmin }) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const task = await getTask(taskId);

    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    // Get submission if exists
    const submission = await getTaskSubmission(taskId);

    const statusEmoji = {
      available: '🟢 Available',
      assigned: '🔵 Assigned',
      submitted: '🟡 Submitted',
      approved: '✅ Approved',
      expired: '🔴 Expired',
    }[task.status] || task.status;

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`${task.taskId} - ${task.title}`)
      .setDescription(`**Status:** ${statusEmoji}`)
      .addFields(
        { name: 'Type', value: task.type === 'comment' ? '💬 Comment Task' : '📄 Post Task', inline: true },
        { name: 'Payment', value: `💰 $${parseFloat(task.payment).toFixed(2)}`, inline: true },
        { name: 'Created', value: task.createdAt
          ? `<t:${Math.floor(new Date(task.createdAt).getTime() / 1000)}:F>`
          : 'Unknown',
          inline: true },
      )
      .setTimestamp();

    // Assigned user info
    if (task.assignedDiscordUsername) {
      embed.addFields(
        { name: '👤 Assigned To', value: `${task.assignedDiscordUsername} (${task.discordUserId || 'Unknown'})`, inline: false },
      );

      if (task.assignedAt) {
        embed.addFields({
          name: '⏰ Assigned At',
          value: `<t:${Math.floor(new Date(task.assignedAt).getTime() / 1000)}:F>`,
          inline: true,
        });
      }

      if (task.expiresAt) {
        const expiryTime = Math.floor(new Date(task.expiresAt).getTime() / 1000);
        embed.addFields({
          name: '⏳ Expires',
          value: `<t:${expiryTime}:R> (<t:${expiryTime}:f>)`,
          inline: true,
        });
      }
    }

    // Access code - admin only
    if (isAdmin(interaction.member)) {
      const codeDisplay = task.accessCode
        ? task.accessCode.substring(0, 4) + '-' + task.accessCode.substring(5)
        : 'None';
      embed.addFields({
        name: '🔑 Access Code',
        value: `||${codeDisplay}||`,
        inline: false,
      });
    }

    // Submission info
    if (submission) {
      embed.addFields(
        { name: '📝 Submission', value: `Status: **${submission.status}**`, inline: false },
        { name: 'Discord Username', value: submission.discordUsername, inline: true },
        { name: 'Submitted', value: submission.submittedAt
          ? `<t:${Math.floor(new Date(submission.submittedAt).getTime() / 1000)}:R>`
          : 'Unknown',
          inline: true },
      );

      if (submission.proofLink) {
        embed.addFields({ name: '🔗 Proof Link', value: submission.proofLink, inline: false });
      }

      if (submission.rejectionReason) {
        embed.addFields({ name: '❌ Rejection Reason', value: submission.rejectionReason, inline: false });
      }
    }

    // Requirements
    if (task.requirements) {
      embed.addFields({
        name: '📋 Requirements',
        value: task.requirements.substring(0, 500),
        inline: false,
      });
    }

    // Admin Notes
    if (submission?.adminNote) {
      embed.addFields({
        name: '📌 Admin Note',
        value: submission.adminNote,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
