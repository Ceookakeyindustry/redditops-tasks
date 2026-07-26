const { getExpiredTasks, updateTask, addActionLog } = require('./supabase');

// Generate a random access code (same algorithm as website)
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check and expire overdue tasks
 * Runs every 5 minutes
 */
async function checkExpiredTasks(client) {
  try {
    const expiredTasks = await getExpiredTasks();

    if (expiredTasks.length === 0) return;

    console.log(`⏰ Found ${expiredTasks.length} expired task(s). Processing...`);

    for (const task of expiredTasks) {
      const newCode = generateAccessCode();

      // Update task in Supabase
      await updateTask(task.taskId, {
        accessCode: newCode,
        accessCodeDisabled: false,
        status: 'available',
        discordUserId: null,
        assignedDiscordUsername: null,
        assignedAt: null,
        expiresAt: null,
      });

      // Log the action
      await addActionLog(
        task.taskId,
        'expired',
        'system',
        { previouslyAssignedTo: task.assignedDiscordUsername }
      );

      // DM the previously assigned user
      if (task.discordUserId) {
        try {
          const user = await client.users.fetch(task.discordUserId);
          if (user) {
            await user.send(
              `> Your assigned task **${task.taskId}** expired because no submission was received within 12 hours.\n\n` +
              `The task is now available for reassignment. Contact an admin if you need a new access code.`
            );
            console.log(`📧 DM sent to ${task.assignedDiscordUsername} about task ${task.taskId} expiry`);
          }
        } catch (dmError) {
          console.warn(`⚠️ Could not DM user ${task.assignedDiscordUsername}: ${dmError.message}`);
        }
      }

      // Notify admin log channel
      const logChannelId = process.env.LOG_CHANNEL_ID;
      if (logChannelId && client) {
        try {
          const channel = await client.channels.fetch(logChannelId);
          if (channel) {
            await channel.send(
              `⏰ **Task Expired**\n\n` +
              `**${task.taskId}** - ${task.title}\n` +
              `Previously assigned to: ${task.assignedDiscordUsername || 'Unknown'}\n` +
              `Status: Available for reassignment`
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

/**
 * Start the expiry checker interval
 */
function startExpiryChecker(client) {
  // Check every 5 minutes
  const INTERVAL_MS = 5 * 60 * 1000;

  // Run immediately on startup
  checkExpiredTasks(client);

  // Then run every 5 minutes
  setInterval(() => {
    checkExpiredTasks(client);
  }, INTERVAL_MS);
}

module.exports = { startExpiryChecker, checkExpiredTasks };
