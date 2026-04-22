import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { fcm } from '../services/fcm.js';
import { msg91 } from '../services/msg91.js';

/**
 * Task 13.7.5: BullMQ broadcast job processor
 * Sends FCM + MSG91 SMS to target audience (customers, shops, delivery partners)
 * Retries on failure, tracks delivery
 */
export async function processBroadcastJob(job) {
  const { broadcastId, title, body, deep_link, target, adminId } = job.data;
  
  logger.info(`Processing broadcast job: ${broadcastId}`, { target });
  
  try {
    let sentCount = 0;
    let failedCount = 0;
    
    if (target === 'customers') {
      // Send to all customers with accounts
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, phone, push_token')
        .eq('role', 'customer');
      
      if (error) throw new Error(`Failed to fetch customers: ${error.message}`);
      
      for (const profile of profiles || []) {
        try {
          // FCM push notification
          if (profile.push_token && fcm && fcm.sendNotification) {
            await fcm.sendNotification({
              title,
              body,
              deep_link: deep_link || null,
              topic: `customer_${profile.id}`
            });
            sentCount++;
          }
        } catch (e) {
          logger.warn('FCM send failed for customer', { customerId: profile.id, error: e.message });
          
          // Fallback: SMS
          if (profile.phone && msg91) {
            try {
              await msg91.sendSMS(profile.phone, body);
              sentCount++;
            } catch (smsError) {
              logger.error('SMS send failed', { phone: profile.phone, error: smsError.message });
              failedCount++;
            }
          }
        }
      }
    } else if (target === 'shops') {
      // Send to all active shop owners
      const { data: shops, error } = await supabase
        .from('shops')
        .select('id, owner_id, owner_phone:owner_id(phone, push_token)')
        .eq('kyc_status', 'approved');
      
      if (error) throw new Error(`Failed to fetch shops: ${error.message}`);
      
      for (const shop of shops || []) {
        try {
          // FCM push notification
          if (shop.owner_phone?.[0]?.push_token && fcm && fcm.sendNotification) {
            await fcm.sendNotification({
              title,
              body,
              deep_link: deep_link || null,
              topic: `shop_${shop.id}`
            });
            sentCount++;
          }
        } catch (e) {
          logger.warn('FCM send failed for shop', { shopId: shop.id, error: e.message });
          
          // Fallback: SMS
          if (shop.owner_phone?.[0]?.phone && msg91) {
            try {
              await msg91.sendSMS(shop.owner_phone[0].phone, body);
              sentCount++;
            } catch (smsError) {
              logger.error('SMS send failed', { shopId: shop.id, error: smsError.message });
              failedCount++;
            }
          }
        }
      }
    } else if (target === 'delivery') {
      // Send to all active delivery partners
      const { data: partners, error } = await supabase
        .from('delivery_partners')
        .select('id, phone, push_token')
        .eq('status', 'active');
      
      if (error) throw new Error(`Failed to fetch delivery partners: ${error.message}`);
      
      for (const partner of partners || []) {
        try {
          // FCM push notification
          if (partner.push_token && fcm && fcm.sendNotification) {
            await fcm.sendNotification({
              title,
              body,
              deep_link: deep_link || null,
              topic: `delivery_${partner.id}`
            });
            sentCount++;
          }
        } catch (e) {
          logger.warn('FCM send failed for delivery partner', { partnerId: partner.id, error: e.message });
          
          // Fallback: SMS
          if (partner.phone && msg91) {
            try {
              await msg91.sendSMS(partner.phone, body);
              sentCount++;
            } catch (smsError) {
              logger.error('SMS send failed', { partnerId: partner.id, error: smsError.message });
              failedCount++;
            }
          }
        }
      }
    }
    
    // Update broadcast record with stats
    const now = new Date().toISOString();
    await supabase
      .from('broadcasts')
      .update({
        status: 'sent',
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: now
      })
      .eq('id', broadcastId);
    
    logger.info(`Broadcast job completed: ${broadcastId}`, { sentCount, failedCount, target });
    
    return { broadcastId, sentCount, failedCount, target };
  } catch (error) {
    logger.error(`Broadcast job failed: ${broadcastId}`, { error: error.message });
    
    // Update status to failed
    await supabase
      .from('broadcasts')
      .update({ status: 'failed', error_message: error.message })
      .eq('id', broadcastId);
    
    throw error; // BullMQ will handle retry
  }
}

export default processBroadcastJob;
