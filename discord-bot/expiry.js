const { getExpiredTasks, updateTask, addActionLog } = require('./supabase');

function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function checkExpiredTasks(client) {
  try {
    const expiredTasks = await getExpiredTasks();
    if (expiredTasks.length === 0) return;
    console.log(`⏰ Found ${expiredTasks.length} expired task(s). Processing...`);

    for (const task of expiredTasks) {
      const newCode = generateAccessCode();
      await updateTask(task.taskId, {
        accessCode: newCode, accessCodeDisabled: false, status: 'available',
        discordUserId: null, assignedDiscordUsername: null, assignedAt: null, expiresAt: null,
      });
      await addActionLog(task.taskId, 'expired', 'system', { previouslyAssignedTo: task.assignedDiscordUsername });

      if (task.discordUserId) {
        try {
          const user = await client.users.fetch(task.discordUserId);
          if (user) {
            await user.send(
              `> Your assigned task **${task.taskId}** expired because no submission was received within 12 hours.\n\n` +
              `The task is now available for reassignment. Contact an admin if you need a new access code.`
            );
          }
        } catch (dmError) {
          console.warn(`⚠️ Could not DM user ${task.assignedDiscordUsername}: ${dmError.message}`);
        }
      }

      const logChannelId = process.env.LOG_CHANNEL_ID;
      if (logChannelId && client) {
        try {
          const channel = await client.channels.fetch(logChannelId);
          if (channel) {
            await channel.send(
              `⏰ **Task Expired**\n**${task.taskId}** - ${task.title}\nPreviously assigned to: ${task.assignedDiscordUsername || 'Unknown'}\nStatus: Available for reassignment`
            );
          }
        } catch (channelError) {
          console.warn(`⚠️ Could not notify log channel: ${channelError.message}`);
        }
      }
      console.log(`✅ Task ${task.taskId} expired and reset to available`);
    }
  } catch (error) {
    console.error('❌ Error in expiry checker:', error.message);
  }
}

function startExpiryChecker(client) {
  checkExpiredTasks(client);
  setInterval(() => { checkExpiredTasks(client); }, 5 * 60 * 1000);
}

module.exports = { startExpiryChecker, checkExpiredTasks };
