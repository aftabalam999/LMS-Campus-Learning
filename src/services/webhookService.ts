import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './firestore';
import { CampusWebhook, WebhookChangeNotification } from '../types';

export class WebhookService {
  /**
   * Get webhook URL for a specific campus
   */
  static async getWebhookByCampus(campus: string): Promise<CampusWebhook | null> {
    try {
      const q = query(
        collection(db, COLLECTIONS.CAMPUS_WEBHOOKS),
        where('campus', '==', campus)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate(),
      } as CampusWebhook;
    } catch (error) {
      console.error('Error fetching webhook:', error);
      throw error;
    }
  }

  /**
   * Get all campus webhooks
   */
  static async getAllWebhooks(): Promise<CampusWebhook[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.CAMPUS_WEBHOOKS));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate(),
      })) as CampusWebhook[];
    } catch (error) {
      console.error('Error fetching all webhooks:', error);
      throw error;
    }
  }

  /**
   * Create or update webhook URL for a campus
   */
  static async saveWebhook(
    campus: string,
    webhookUrl: string,
    userId: string,
    userName: string
  ): Promise<CampusWebhook> {
    try {
      // Check if webhook already exists
      const existing = await this.getWebhookByCampus(campus);
      
      if (existing) {
        // Update existing webhook
        const webhookRef = doc(db, COLLECTIONS.CAMPUS_WEBHOOKS, existing.id);
        await updateDoc(webhookRef, {
          webhook_url: webhookUrl,
          updated_by: userId,
          updated_by_name: userName,
          updated_at: serverTimestamp(),
        });

        // Create notification for update
        await this.createWebhookChangeNotification(
          campus,
          userId,
          userName,
          existing.webhook_url,
          webhookUrl,
          'updated'
        );

        return {
          ...existing,
          webhook_url: webhookUrl,
          updated_by: userId,
          updated_by_name: userName,
          updated_at: new Date(),
        };
      } else {
        // Create new webhook
        const newWebhook = {
          campus,
          webhook_url: webhookUrl,
          created_by: userId,
          created_by_name: userName,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.CAMPUS_WEBHOOKS), newWebhook);

        // Create notification for creation
        await this.createWebhookChangeNotification(
          campus,
          userId,
          userName,
          undefined,
          webhookUrl,
          'created'
        );

        return {
          id: docRef.id,
          ...newWebhook,
          created_at: new Date(),
          updated_at: new Date(),
        } as CampusWebhook;
      }
    } catch (error) {
      console.error('Error saving webhook:', error);
      throw error;
    }
  }

  /**
   * Create a webhook change notification
   */
  private static async createWebhookChangeNotification(
    campus: string,
    userId: string,
    userName: string,
    oldWebhookUrl: string | undefined,
    newWebhookUrl: string,
    changeType: 'created' | 'updated' | 'deleted'
  ): Promise<void> {
    try {
      const notification: any = {
        campus,
        changed_by: userId,
        changed_by_name: userName,
        new_webhook_url: newWebhookUrl,
        change_type: changeType,
        timestamp: serverTimestamp(),
        is_read: false,
        read_by: [],
        created_at: serverTimestamp(),
      };

      // Only add old_webhook_url if it exists
      if (oldWebhookUrl) {
        notification.old_webhook_url = oldWebhookUrl;
      }

      await addDoc(collection(db, COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS), notification);
    } catch (error) {
      console.error('Error creating webhook change notification:', error);
      throw error;
    }
  }

  /**
   * Get unread webhook change notifications
   */
  static async getUnreadNotifications(userId: string): Promise<WebhookChangeNotification[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS),
        where('is_read', '==', false),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          created_at: doc.data().created_at?.toDate(),
        }))
        .filter((notif: any) => !notif.read_by || !notif.read_by.includes(userId)) as WebhookChangeNotification[];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  /**
   * Get all webhook change notifications (for notification center)
   */
  static async getAllNotifications(limitCount: number = 50): Promise<WebhookChangeNotification[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        created_at: doc.data().created_at?.toDate(),
      })) as WebhookChangeNotification[];
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS, notificationId);
      
      // Get current notification
      const snapshot = await getDocs(
        query(collection(db, COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS), where('__name__', '==', notificationId))
      );
      
      if (!snapshot.empty) {
        const currentData = snapshot.docs[0].data();
        const readBy = currentData.read_by || [];
        
        if (!readBy.includes(userId)) {
          readBy.push(userId);
        }
        
        await updateDoc(notificationRef, {
          read_by: readBy,
          is_read: true, // Mark as read when at least one person has read it
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const notifications = await this.getUnreadNotifications(userId);
      
      const promises = notifications.map(notif => 
        this.markNotificationAsRead(notif.id, userId)
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}
