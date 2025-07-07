import cron from 'node-cron';
import User from '../models/User.js';
import logger from '../config/logger.js';
import SubscriptionService from './subscriptionService.js';

class CronService {
  // Initialize all cron jobs
  static init() {
    this.initSubscriptionJobs();
    this.initXPDecayJobs();
    this.initCleanupJobs();
    logger.info('✅ All cron jobs initialized');
  }

  // Initialize subscription-related cron jobs
  static initSubscriptionJobs() {
    // Daily subscription auto-renewal check at 2 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('🔄 Running daily subscription auto-renewal check');
      try {
        await SubscriptionService.checkExpiredSubscriptions();
        await SubscriptionService.processAutoRenewals();
        logger.info('✅ Subscription auto-renewal check completed');
      } catch (error) {
        logger.error('❌ Error in subscription auto-renewal:', error);
      }
    });

    // Weekly subscription reminder (3 days before expiry) at 10 AM on Mondays
    cron.schedule('0 10 * * 1', async () => {
      logger.info('📧 Running weekly subscription expiry reminders');
      try {
        await this.sendSubscriptionReminders();
        logger.info('✅ Subscription reminders sent');
      } catch (error) {
        logger.error('❌ Error sending subscription reminders:', error);
      }
    });

    logger.info('📅 Subscription cron jobs initialized');
  }

  // Initialize XP decay cron jobs (optional feature)
  static initXPDecayJobs() {
    // Weekly XP decay on Sundays at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      logger.info('📉 Running weekly XP decay');
      try {
        await this.processXPDecay();
        logger.info('✅ XP decay processing completed');
      } catch (error) {
        logger.error('❌ Error in XP decay processing:', error);
      }
    });

    logger.info('🎮 XP decay cron jobs initialized');
  }

  // Initialize cleanup cron jobs
  static initCleanupJobs() {
    // Daily cleanup at 1 AM
    cron.schedule('0 1 * * *', async () => {
      logger.info('🧹 Running daily cleanup tasks');
      try {
        await this.cleanupExpiredTokens();
        await this.cleanupExpiredSessions();
        await this.cleanupOldNotifications();
        await this.cleanupTempFiles();
        logger.info('✅ Daily cleanup completed');
      } catch (error) {
        logger.error('❌ Error in daily cleanup:', error);
      }
    });

    // Weekly database optimization on Sundays at 4 AM
    cron.schedule('0 4 * * 0', async () => {
      logger.info('🔧 Running weekly database optimization');
      try {
        await this.optimizeDatabase();
        logger.info('✅ Database optimization completed');
      } catch (error) {
        logger.error('❌ Error in database optimization:', error);
      }
    });

    logger.info('🧹 Cleanup cron jobs initialized');
  }

  // Send subscription expiry reminders
  static async sendSubscriptionReminders() {
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const usersNearExpiry = await User.find({
        isPro: true,
        subscriptionStatus: 'active',
        subscriptionEndDate: {
          $lte: threeDaysFromNow,
          $gt: new Date()
        },
        reminderSent: { $ne: true }
      }).populate('subscriptionPlan');

      logger.info(`Found ${usersNearExpiry.length} users needing subscription reminders`);

      for (const user of usersNearExpiry) {
        try {
          // TODO: Integrate with email service
          logger.info(`Sending subscription reminder to user ${user._id}`);
          
          // Mark reminder as sent to avoid spam
          await User.findByIdAndUpdate(user._id, { reminderSent: true });
        } catch (error) {
          logger.error(`Error sending reminder to user ${user._id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in subscription reminders:', error);
      throw error;
    }
  }

  // Process XP decay for inactive users
  static async processXPDecay() {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Find users who haven't been active in the last week
      const inactiveUsers = await User.find({
        lastActivity: { $lt: oneWeekAgo },
        totalXP: { $gt: 0 }
      });

      logger.info(`Processing XP decay for ${inactiveUsers.length} inactive users`);

      for (const user of inactiveUsers) {
        try {
          // Decay 5% of XP per week of inactivity
          const decayRate = 0.05;
          const weeksSinceActivity = Math.floor((Date.now() - user.lastActivity) / (7 * 24 * 60 * 60 * 1000));
          const decayAmount = Math.floor(user.totalXP * decayRate * weeksSinceActivity);

          if (decayAmount > 0) {
            const newXP = Math.max(0, user.totalXP - decayAmount);
            
            await User.findByIdAndUpdate(user._id, {
              totalXP: newXP,
              currentLevel: this.calculateLevel(newXP)
            });

            logger.info(`Decayed ${decayAmount} XP for user ${user._id} (${user.totalXP} -> ${newXP})`);
          }
        } catch (error) {
          logger.error(`Error processing XP decay for user ${user._id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in XP decay processing:', error);
      throw error;
    }
  }

  // Calculate user level based on XP
  static calculateLevel(xp) {
    // Simple level calculation: every 1000 XP = 1 level
    return Math.floor(xp / 1000) + 1;
  }

  // Cleanup expired JWT tokens
  static async cleanupExpiredTokens() {
    try {
      const now = new Date();
      
      // Remove expired password reset tokens
      const passwordResetResult = await User.updateMany(
        {
          passwordResetExpires: { $lt: now }
        },
        {
          $unset: {
            passwordResetToken: 1,
            passwordResetExpires: 1
          }
        }
      );

      // Remove expired email verification tokens
      const emailVerificationResult = await User.updateMany(
        {
          emailVerificationExpires: { $lt: now }
        },
        {
          $unset: {
            emailVerificationToken: 1,
            emailVerificationExpires: 1
          }
        }
      );

      logger.info(`Cleaned up ${passwordResetResult.modifiedCount} expired password reset tokens`);
      logger.info(`Cleaned up ${emailVerificationResult.modifiedCount} expired email verification tokens`);
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  // Cleanup expired sessions
  static async cleanupExpiredSessions() {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Remove users who haven't logged in for over a month and aren't pro users
      const result = await User.updateMany(
        {
          lastLogin: { $lt: oneMonthAgo },
          isPro: false,
          isEmailVerified: false
        },
        {
          $set: { sessionExpired: true }
        }
      );

      logger.info(`Marked ${result.modifiedCount} inactive user sessions as expired`);
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  // Cleanup old notifications
  static async cleanupOldNotifications() {
    try {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      // TODO: Implement with Notification model when available
      // const result = await Notification.deleteMany({
      //   createdAt: { $lt: twoMonthsAgo },
      //   isRead: true
      // });

      logger.info('Old notifications cleanup completed (TODO: implement with Notification model)');
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  // Cleanup temporary files
  static async cleanupTempFiles() {
    try {
      // TODO: Implement file cleanup logic for uploaded files, temp avatars, etc.
      logger.info('Temporary files cleanup completed (TODO: implement file cleanup logic)');
    } catch (error) {
      logger.error('Error cleaning up temporary files:', error);
      throw error;
    }
  }

  // Optimize database performance
  static async optimizeDatabase() {
    try {
      // Run database maintenance tasks
      // TODO: Implement database optimization queries
      logger.info('Database optimization completed (TODO: implement optimization queries)');
    } catch (error) {
      logger.error('Error in database optimization:', error);
      throw error;
    }
  }

  // Get cron job status
  static getStatus() {
    const tasks = cron.getTasks();
    const status = {
      totalJobs: tasks.size,
      runningJobs: 0,
      nextRuns: []
    };

    tasks.forEach((task, name) => {
      if (task.running) {
        status.runningJobs++;
      }
      // Note: node-cron doesn't expose next run time easily
      // This would need a custom implementation to track
    });

    return status;
  }

  // Manually trigger specific job (for testing)
  static async runJob(jobName) {
    try {
      switch (jobName) {
        case 'subscription-renewal':
          await SubscriptionService.processAutoRenewals();
          break;
        case 'xp-decay':
          await this.processXPDecay();
          break;
        case 'cleanup-tokens':
          await this.cleanupExpiredTokens();
          break;
        case 'cleanup-sessions':
          await this.cleanupExpiredSessions();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
      logger.info(`✅ Manually executed job: ${jobName}`);
    } catch (error) {
      logger.error(`❌ Error executing job ${jobName}:`, error);
      throw error;
    }
  }
}

export default CronService;
