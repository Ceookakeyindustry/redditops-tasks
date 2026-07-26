const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserPaymentMethod } = require('../utils/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mypayment')
    .setDescription('View your saved payment method'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordUserId = interaction.user.id;
    const paymentMethod = await getUserPaymentMethod(discordUserId);

    if (!paymentMethod) {
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('💰 Payment Method Not Set')
        .setDescription(
          'You haven\'t set a payment method yet.\n\n' +
          'Use `/setpayment` to save your preferred payment option:\n' +
          '• `/setpayment method:UPI details:your@upi`\n' +
          '• `/setpayment method:CRYPTO details:0xYourWallet...`\n' +
          '• `/setpayment method:PAYPAL details:your@email.com`'
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
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
      .setColor(0x8B5CF6)
      .setTitle('💰 Your Payment Method')
      .addFields(
        { name: 'Method', value: `${methodEmojis[paymentMethod.methodType] || '💰'} ${methodNames[paymentMethod.methodType] || paymentMethod.methodType}`, inline: true },
        { name: 'Details', value: `||${paymentMethod.methodDetails}||`, inline: false },
        { name: 'Saved On', value: paymentMethod.updatedAt
          ? `<t:${Math.floor(new Date(paymentMethod.updatedAt).getTime() / 1000)}:F>`
          : 'Unknown',
          inline: false },
      )
      .setFooter({ text: 'Use /setpayment to update your payment method' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
