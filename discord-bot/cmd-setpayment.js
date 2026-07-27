const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserPaymentMethod, setUserPaymentMethod } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setpayment')
    .setDescription('Set your preferred payment method')
    .addStringOption(option =>
      option.setName('method')
        .setDescription('Choose your payment method')
        .setRequired(true)
        .addChoices(
          { name: 'UPI', value: 'UPI' },
          { name: 'Crypto (USDT/POL)', value: 'CRYPTO' },
          { name: 'PayPal', value: 'PAYPAL' },
        ))
    .addStringOption(option =>
      option.setName('details')
        .setDescription('Your UPI ID, wallet address, or PayPal email')
        .setRequired(true)
        .setMaxLength(500)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const method = interaction.options.getString('method');
    const details = interaction.options.getString('details');
    const discordUserId = interaction.user.id;
    const discordUsername = interaction.user.username;

    // Basic validation based on method type
    if (method === 'UPI' && !details.includes('@')) {
      return interaction.editReply(
        '❌ Invalid UPI ID. A UPI ID typically looks like `username@upi` or `example@paytm`.\n' +
        'Please include the `@` symbol and try again.'
      );
    }

    if (method === 'PAYPAL' && !details.includes('@') && !details.includes('.')) {
      return interaction.editReply(
        '❌ That doesn\'t look like a PayPal email. Please enter a valid email address.\n' +
        'Example: `your-email@example.com`'
      );
    }

    if (method === 'CRYPTO' && details.length < 10) {
      return interaction.editReply(
        '❌ That doesn\'t look like a valid crypto wallet address. Please enter the full address.\n' +
        'Example: `0x1234...` for Ethereum/Polygon or `bc1...` for Bitcoin'
      );
    }

    // Store payment method in Supabase
    const result = await setUserPaymentMethod(discordUserId, method, details);

    if (!result) {
      return interaction.editReply(
        '❌ Failed to save your payment method. Please try again later or contact an admin.'
      );
    }

    const methodEmojis = {
      UPI: '📱',
      CRYPTO: '₿',
      PAYPAL: '💳',
    };

    const methodNames = {
      UPI: 'UPI',
      CRYPTO: 'Crypto (USDT/POL)',
      PAYPAL: 'PayPal',
    };

    const embed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle('✅ Payment Method Saved')
      .setDescription('Your preferred payment method has been saved.')
      .addFields(
        { name: 'Method', value: `${methodEmojis[method] || '💰'} ${methodNames[method] || method}`, inline: true },
        { name: 'Details', value: `||${details}||`, inline: false },
      )
      .setFooter({ text: 'Admins will use this info to send your payments.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
