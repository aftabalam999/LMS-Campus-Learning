import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/firestore';
import Toast from './Toast';

export default function UserProfile() {
  const { userData, setUserData } = useAuth();
  const [apiKey, setApiKey] = useState(userData?.gemini_api_key || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  if (!userData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess(false);
    try {
      await UserService.updateUser(userData.id, { gemini_api_key: apiKey.trim() });
      setUserData({ ...userData, gemini_api_key: apiKey.trim() });
      setSuccess(true);
      setToast({ visible: true, message: 'Profile saved', type: 'success' });
    } catch (err) {
      setError('Failed to save API key.');
      setToast({ visible: true, message: 'Failed to save', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Profile Settings</h2>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gemini API Key <span className="text-xs text-gray-500">(Optional)</span>
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Paste your Gemini API key here"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
        />
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Get your free Gemini API key:</strong>
          </p>
          <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
            <li>Go to <a href="https://aistudio.google.com/app/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 font-medium">Google AI Studio API Keys</a></li>
            <li>Sign in with your Google account</li>
            <li>Click "Create API key"</li>
            <li>Copy the generated key</li>
            <li>Paste it here and save</li>
          </ol>
          <p className="text-xs text-blue-700 mt-2">
            Note: This is different from your Firebase API key. Use the key from Google AI Studio.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save API Key'}
        </button>
        {success && <p className="mt-2 text-green-600 text-sm">API key saved!</p>}
        {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      </div>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type as any}
        onClose={() => setToast({ visible: false, message: '', type: 'info' })}
      />
    </div>
  );
}
