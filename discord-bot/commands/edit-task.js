const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTask, updateTask, addActionLog } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edit-task')
    .setDescription('Edit task details (payment, title, active status)')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('Task ID (e.g., ROT-001)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('field')
        .setDescription('Field to edit')
        .setRequired(true)
        .addChoices(
          { name: 'Payment Amount', value: 'payment' },
          { name: 'Task Title', value: 'title' },
          { name: 'Toggle Active/Inactive', value: 'active' },
          { name: 'Requirements', value: 'requirements' },
          { name: 'Max Completions', value: 'maxcompletions' },
        ))
    .addStringOption(option =>
      option.setName('value')
        .setDescription('New value for the field')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const taskId = interaction.options.getString('task_id').toUpperCase();
    const field = interaction.options.getString('field');
    const value = interaction.options.getString('value');

    const task = await getTask(taskId);
    if (!task) {
      return interaction.editReply(`❌ Task **${taskId}** not found.`);
    }

    let updateData = {};
    let fieldLabel = '';
    let oldValue = '';

    switch (field) {
      case 'payment': {
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) {
          return interaction.editReply('❌ Please enter a valid payment amount (e.g., 5.00).');
        }
        updateData = { payment: amount };
        fieldLabel = 'Payment';
        oldValue = `$${parseFloat(task.payment).toFixed(2)}`;
        break;
      }
      case 'title': {
        if (value.trim().length < 2) {
          return interaction.editReply('❌ Title must be at least 2 characters.');
        }
        updateData = { title: value.trim() };
        fieldLabel = 'Title';
        oldValue = task.title;
        break;
      }
      case 'active': {
        const isActive = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes' || value.toLowerCase() === 'active';
        updateData = { isActive };
        fieldLabel = 'Active Status';
        oldValue = task.isActive ? 'Active' : 'Inactive';
        break;
      }
      case 'requirements': {
        updateData = { requirements: value };
        fieldLabel = 'Requirements';
        oldValue = task.requirements || '(empty)';
        break;
      }
      case 'maxcompletions': {
        const max = parseInt(value);
        updateData = { maxCompletions: isNaN(max) || max < 1 ? null : max };
        fieldLabel = 'Max Completions';
        oldValue = task.maxCompletions ? String(task.maxCompletions) : 'Unlimited';
        break;
      }
    }

    const updated = await updateTask(taskId, updateData);
    if (!updated) {
      return interaction.editReply(`❌ Failed to update task ${taskId}.`);
    }

    await addActionLog(taskId, `edited_${field}`, interaction.user.tag, {
      field,
      oldValue,
      newValue: value,
    });

    const newDisplay = field === 'payment' ? `$${parseFloat(value).toFixed(2)}` : value;

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('✅ Task Updated')
      .addFields(
        { name: 'Task', value: `${taskId} - ${task.title}`, inline: false },
        { name: 'Field', value: fieldLabel, inline: true },
        { name: 'Before', value: oldValue.substring(0, 100), inline: true },
        { name: 'After', value: newDisplay.substring(0, 100), inline: true },
      )
      .setFooter({ text: `Updated by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
