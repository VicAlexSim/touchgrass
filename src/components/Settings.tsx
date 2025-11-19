import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { useAuth0 } from "@auth0/auth0-react";
import { api } from "../../convex/_generated/api";

export function Settings() {
  const [riskThreshold, setRiskThreshold] = useState(75);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [workingHoursStart, setWorkingHoursStart] = useState(9);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(17);
  const [targetBreakInterval, setTargetBreakInterval] = useState(120);
  const [isSeeding, setIsSeeding] = useState(false);

  const { user } = useAuth0();
  const updateSettings = useMutation(api.burnout.updateUserSettings);
  const seedMockData = useAction(api.mockData.seedAllMockDataWithIntegrations);

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

  const handleSeedMockData = async () => {
    if (!user?.sub) {
      alert("Please log in first!");
      return;
    }

    if (!confirm("This will generate 30 days of mock data including Linear story points and Wakatime coding sessions. Continue?")) {
      return;
    }

    setIsSeeding(true);
    try {
      const result = await seedMockData({ userId: user.sub, days: 30 });
      alert(`Mock data seeded successfully!\n\nGenerated:\n- ${result.counts.burnout} burnout scores\n- ${result.counts.breaks} break records\n- ${result.counts.sessions} work sessions\n- ${result.counts.linear} Linear story points\n- ${result.counts.wakatime} Wakatime coding sessions`);
    } catch (error) {
      console.error("Error seeding mock data:", error);
      alert("Failed to seed mock data. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Developer Tools Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🛠️</span>
          <h3 className="text-lg font-semibold text-gray-900">Developer Tools</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Generate mock data for testing and demo purposes. This will create 30 days of data including Linear story points and Wakatime coding sessions.
        </p>
        
        <button
          onClick={handleSeedMockData}
          disabled={isSeeding}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSeeding ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Mock Data...
            </span>
          ) : (
            "🌱 Seed Mock Data (30 days)"
          )}
        </button>
        
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs text-amber-800 flex items-center gap-2">
            <span className="text-base flex-shrink-0">⚠️</span>
            <span>This will add data to your database. Use for testing only.</span>
          </p>
        </div>
      </div>

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

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
