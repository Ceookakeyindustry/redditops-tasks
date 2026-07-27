const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, getTaskSubmission, updateTask, addActionLog, getSupabase } = require('../utils/supabase');

// Match the website's generateAccessCode in src/lib/types.ts
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reject')
    .setDescription('Reject a submission with a reason')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for rejection')
        .setRequired(true)
        .setMaxLength(500)),

  async execute(interaction, { client }) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const reason = interaction.options.getString('reason');

    const task = await getTask(taskId);

    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    if (task.status !== 'submitted' && task.status !== 'assigned') {
      return interaction.editReply(
        `❌ Task **${taskId}** cannot be rejected. Current status: **${task.status}**.`
      );
    }

    // Get the submission (if any)
    const submission = await getTaskSubmission(taskId);
    const previousUser = task.assignedDiscordUsername;

    // Generate new access code
    const newCode = generateAccessCode();

    // Update task - reset to available
    await updateTask(taskId, {
      accessCode: newCode,
      accessCodeDisabled: false,
      status: 'available',
      discordUserId: null,
      assignedDiscordUsername: null,
      assignedAt: null,
      expiresAt: null,
    });

    // Update submission in Supabase
    const supabase = getSupabase();
    if (supabase && submission) {
      await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('ref_id', submission.refId);
    } else if (supabase && !submission) {
      // No submission exists yet, just reset the task
      console.log(`No submission found for ${taskId}, just resetting task.`);
    }

    // Log the action
    await addActionLog(
      taskId,
      'rejected',
      interaction.user.tag,
      { reason, previouslyAssignedTo: previousUser }
    );

    // DM the previously assigned worker
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
              { name: 'Reason', value: reason, inline: false },
            )
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        }
      } catch (dmError) {
        console.warn(`⚠️ Could not DM user for rejection: ${dmError.message}`);
      }
    }

    // Notify log channel
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (logChannelId) {
      try {
        const channel = await interaction.client.channels.fetch(logChannelId);
        if (channel) {
          await channel.send(
            `❌ **Task Rejected**\n**${taskId}** - ${task.title}\nRejected by: ${interaction.user.tag}\nReason: ${reason}\nWorker: ${previousUser || 'Unknown'}`
          );
        }
      } catch (e) {}
    }

    const embed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('❌ Task Rejected')
      .addFields(
        { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
        { name: 'Previous Worker', value: previousUser || 'Unknown', inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'New Status', value: 'Available for reassignment', inline: true },
      )
      .setFooter({ text: 'A new access code has been generated.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
