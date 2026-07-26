const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, getTaskSubmission, updateTask, addActionLog, getSupabase } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approve a submitted task')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true)),

  async execute(interaction, { client }) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const task = await getTask(taskId);

    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    if (task.status !== 'submitted') {
      return interaction.editReply(
        `❌ Task **${taskId}** has not been submitted yet. Current status: **${task.status}**.`
      );
    }

    // Get the submission
    const submission = await getTaskSubmission(taskId);
    if (!submission) {
      return interaction.editReply(`❌ No submission found for task **${taskId}**.`);
    }

    // Update task status
    await updateTask(taskId, { status: 'approved' });

    // Update submission in Supabase (status only, is_paid is handled separately)
    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from('submissions')
        .update({ status: 'approved' })
        .eq('ref_id', submission.refId);
    }

    // Log the action
    await addActionLog(
      taskId,
      'approved',
      interaction.user.tag,
      { assignedDiscordUsername: task.assignedDiscordUsername }
    );

    // DM the assigned worker
    if (task.discordUserId) {
      try {
        const user = await client.users.fetch(task.discordUserId);
        if (user) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Submission Approved')
            .setDescription(`Your submission for **${taskId}** has been approved.`)
            .addFields(
              { name: 'Task', value: `${taskId} - ${task.title}`, inline: true },
              { name: 'Payment', value: `$${parseFloat(task.payment).toFixed(2)}`, inline: true },
            )
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        }
      } catch (dmError) {
        console.warn(`⚠️ Could not DM user for approval: ${dmError.message}`);
      }
    }

    // Notify log channel
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (logChannelId) {
      try {
        const channel = await interaction.client.channels.fetch(logChannelId);
        if (channel) {
          await channel.send(
            `✅ **Task Approved**\n**${taskId}** - ${task.title}\nApproved by: ${interaction.user.tag}\nWorker: ${task.assignedDiscordUsername || 'Unknown'}`
          );
        }
      } catch (e) {}
    }

    const embed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle('✅ Task Approved')
      .addFields(
        { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
        { name: 'Worker', value: task.assignedDiscordUsername || 'Unknown', inline: true },
        { name: 'Payment', value: `$${parseFloat(task.payment).toFixed(2)}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
