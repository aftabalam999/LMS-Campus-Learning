import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Loader, Webhook, AlertCircle } from 'lucide-react';
import { WebhookService } from '../../services/webhookService';
import { WebhookChangeNotification } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface WebhookNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const WebhookNotificationPanel: React.FC<WebhookNotificationPanelProps> = ({ isOpen, onClose }) => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<WebhookChangeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const allNotifications = await WebhookService.getAllNotifications(50);
      setNotifications(allNotifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userData?.id) return;

    try {
      await WebhookService.markNotificationAsRead(notificationId, userData.id);
      await loadNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userData?.id) return;

    try {
      await WebhookService.markAllNotificationsAsRead(userData.id);
      await loadNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getUnreadCount = () => {
    if (!userData?.id) return 0;
    return notifications.filter(
      notif => !notif.read_by || !notif.read_by.includes(userData.id)
    ).length;
  };

  const isNotificationRead = (notification: WebhookChangeNotification) => {
    if (!userData?.id) return false;
    return notification.read_by && notification.read_by.includes(userData.id);
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      default:
        return changeType;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary-600 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Webhook Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-primary-700 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {getUnreadCount() > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-primary-100">
                {getUnreadCount()} unread notification{getUnreadCount() !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary-100 hover:text-white underline"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">No webhook notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    isNotificationRead(notification)
                      ? 'bg-white'
                      : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Webhook className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      isNotificationRead(notification) ? 'text-gray-400' : 'text-primary-600'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                            getChangeTypeColor(notification.change_type)
                          }`}>
                            {getChangeTypeLabel(notification.change_type)}
                          </span>
                        </div>
                        {!isNotificationRead(notification) && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-gray-600" />
                          </button>
                        )}
                      </div>

                      <p className={`text-sm mb-2 ${
                        isNotificationRead(notification) ? 'text-gray-600' : 'text-gray-900 font-medium'
                      }`}>
                        <span className="font-semibold">{notification.changed_by_name}</span> {notification.change_type} webhook URL for{' '}
                        <span className="font-semibold">{notification.campus}</span>
                      </p>

                      {notification.old_webhook_url && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">Previous URL:</p>
                          <p className="text-xs text-gray-600 bg-gray-100 rounded p-2 break-all">
                            {notification.old_webhook_url}
                          </p>
                        </div>
                      )}

                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">New URL:</p>
                        <p className="text-xs text-gray-600 bg-gray-100 rounded p-2 break-all">
                          {notification.new_webhook_url}
                        </p>
                      </div>

                      <p className="text-xs text-gray-400">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WebhookNotificationPanel;
