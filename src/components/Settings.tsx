import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Settings() {
  const [riskThreshold, setRiskThreshold] = useState(75);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [workingHoursStart, setWorkingHoursStart] = useState(9);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(17);
  const [targetBreakInterval, setTargetBreakInterval] = useState(120);

  const updateSettings = useMutation(api.burnout.updateUserSettings);

  const handleSave = async () => {
    try {
      await updateSettings({
        riskThreshold,
        notificationsEnabled,
        workingHoursStart,
        workingHoursEnd,
        targetBreakInterval,
      });
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  const requestNotificationPermission = async () => {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Burnout Detection Settings</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Threshold: {riskThreshold}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              You'll be notified when your burnout risk exceeds this threshold
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable browser notifications
              </span>
            </label>
            {Notification.permission === "default" && (
              <button
                onClick={requestNotificationPermission}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Grant notification permission
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Schedule</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <select
              value={workingHoursStart}
              onChange={(e) => setWorkingHoursStart(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <select
              value={workingHoursEnd}
              onChange={(e) => setWorkingHoursEnd(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Break Reminders</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target break interval: {targetBreakInterval} minutes
          </label>
          <input
            type="range"
            min="30"
            max="240"
            step="15"
            value={targetBreakInterval}
            onChange={(e) => setTargetBreakInterval(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Recommended break frequency for optimal productivity
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
      >
        Save Settings
      </button>
    </div>
  );
}
