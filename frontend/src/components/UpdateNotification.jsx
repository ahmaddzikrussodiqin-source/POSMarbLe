import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION, APP_NAME } from '../config/version';
import { appVersionAPI } from '../services/api';

const UpdateNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only check for updates when running in Capacitor (Android app)
    const checkForUpdates = async () => {
      // Check if running in Capacitor
      if (!Capacitor.isNativePlatform()) {
        console.log('Not running in native platform, skipping update check');
        return;
      }

      // Check if user previously dismissed
      const wasDismissed = localStorage.getItem('update_dismissed_v1');
      if (wasDismissed) {
        setDismissed(true);
        return;
      }

      try {
        const response = await appVersionAPI.checkUpdate(APP_VERSION);
        const { needsUpdate, latestVersion, forced, releaseNotes, updateUrl } = response.data;
        
        setUpdateInfo({
          needsUpdate,
          latestVersion,
          forced,
          releaseNotes,
          updateUrl
        });

        if (needsUpdate) {
          setShowNotification(true);
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    checkForUpdates();
  }, []);

  const handleDismiss = () => {
    setShowNotification(false);
    setDismissed(true);
    // Save dismissal to localStorage (for current version)
    localStorage.setItem('update_dismissed_v1', 'true');
  };

  const handleUpdate = () => {
    if (updateInfo?.updateUrl) {
      // Open the update URL in the app
      window.location.href = updateInfo.updateUrl;
    }
  };

  // Don't render if not in native platform or update not needed or dismissed
  if (!Capacitor.isNativePlatform() || !showNotification || !updateInfo) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl mx-4 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-4 py-3">
          <h3 className="text-white font-semibold text-lg">
            {updateInfo.forced ? 'Update Wajib' : 'Update Tersedia'}
          </h3>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 mb-2">
            {APP_NAME} versi <strong>{updateInfo.latestVersion}</strong> sudah tersedia!
          </p>
          <p className="text-gray-600 text-sm mb-4">
            {updateInfo.releaseNotes || 'Perbaikan bug dan peningkatan performa'}
          </p>
          
          <p className="text-xs text-gray-500 mb-4">
            Versi saat ini: {APP_VERSION}
          </p>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          {!updateInfo.forced && (
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Nanti Saja
            </button>
          )}
          <button
            onClick={handleUpdate}
            className={`flex-1 px-4 py-2 text-white rounded-md transition-colors text-sm font-medium ${
              updateInfo.forced 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {updateInfo.forced ? 'Update Sekarang' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

