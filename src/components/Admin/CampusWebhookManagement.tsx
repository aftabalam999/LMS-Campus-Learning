import React, { useState, useEffect } from 'react';
import { Link, Save, AlertCircle, CheckCircle, Loader, Webhook } from 'lucide-react';
import { WebhookService } from '../../services/webhookService';
import { DiscordService } from '../../services/discordService';
import { CampusWebhook } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const CAMPUSES = [
  'Dantewada',
  'Dharamshala',
  'Eternal',
  'Jashpur',
  'Kishanganj',
  'Pune',
  'Raigarh',
  'Sarjapura'
];

const CampusWebhookManagement: React.FC = () => {
  const { userData } = useAuth();
  const [webhooks, setWebhooks] = useState<{ [campus: string]: CampusWebhook | null }>({});
  const [editingCampus, setEditingCampus] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const allWebhooks = await WebhookService.getAllWebhooks();
      
      const webhookMap: { [campus: string]: CampusWebhook | null } = {};
      CAMPUSES.forEach(campus => {
        const webhook = allWebhooks.find(w => w.campus === campus);
        webhookMap[campus] = webhook || null;
      });
      
      setWebhooks(webhookMap);
    } catch (err) {
      console.error('Error loading webhooks:', err);
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (campus: string) => {
    setEditingCampus(campus);
    setWebhookUrl(webhooks[campus]?.webhook_url || '');
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditingCampus(null);
    setWebhookUrl('');
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (campus: string) => {
    if (!webhookUrl.trim()) {
      setError('Webhook URL cannot be empty');
      return;
    }

    // Basic URL validation
    try {
      new URL(webhookUrl);
    } catch (e) {
      setError('Please enter a valid URL');
      return;
    }

    if (!userData?.id || !userData?.name) {
      setError('User information not available');
      return;
    }

    try {
      setSaving(campus);
      setError(null);
      
      await WebhookService.saveWebhook(
        campus,
        webhookUrl.trim(),
        userData.id,
        userData.name
      );
      
      // Clear the Discord service cache for this campus so it uses the new URL
      DiscordService.clearWebhookCache(campus);
      
      setSuccess(`Webhook URL ${webhooks[campus] ? 'updated' : 'saved'} successfully for ${campus}`);
      await loadWebhooks();
      setEditingCampus(null);
      setWebhookUrl('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving webhook:', err);
      setError('Failed to save webhook URL');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Webhook className="h-6 w-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-900">Campus Webhook Management</h2>
      </div>

      <p className="text-gray-600">
        Configure webhook URLs for each campus to receive notifications and updates.
      </p>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Webhook List */}
      <div className="grid grid-cols-1 gap-4">
        {CAMPUSES.map(campus => (
          <div
            key={campus}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{campus}</h3>
              {webhooks[campus] && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Configured
                </span>
              )}
            </div>

            {editingCampus === campus ? (
              // Edit Mode
              <div className="space-y-3">
                <div>
                  <label htmlFor={`webhook-${campus}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-gray-400" />
                    <input
                      id={`webhook-${campus}`}
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.example.com/webhook/..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSave(campus)}
                    disabled={saving === campus}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving === campus ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving === campus}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-3">
                {webhooks[campus] ? (
                  <>
                    <div className="flex items-start gap-2 bg-gray-50 rounded p-3">
                      <Link className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 break-all">
                          {webhooks[campus]?.webhook_url}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                      {webhooks[campus]?.updated_by_name && (
                        <p>Last updated by: {webhooks[campus]?.updated_by_name}</p>
                      )}
                      {webhooks[campus]?.updated_at && (
                        <p>Last updated: {new Date(webhooks[campus]!.updated_at).toLocaleString()}</p>
                      )}
                      {!webhooks[campus]?.updated_by_name && webhooks[campus]?.created_by_name && (
                        <p>Created by: {webhooks[campus]?.created_by_name}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleEdit(campus)}
                      className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors font-medium"
                    >
                      Update Webhook URL
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">No webhook configured for this campus</p>
                    <button
                      onClick={() => handleEdit(campus)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Add Webhook URL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampusWebhookManagement;
