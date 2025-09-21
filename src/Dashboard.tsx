import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
import { RiskScoreCard } from "./components/RiskScoreCard";
import { VelocityChart } from "./components/VelocityChart";
import { MoodChart } from "./components/MoodChart";
import { WorkHoursChart } from "./components/WorkHoursChart";
import { WakatimeChart } from "./components/WakatimeChart";
import { WebcamMonitor } from "./components/WebcamMonitor";
import { LinearIntegration } from "./components/LinearIntegration";
import { WakatimeIntegration } from "./components/WakatimeIntegration";
import { Settings } from "./components/Settings";
import { CommitChart } from "./components/CommitChart";
import { BurnoutHistoryChart } from "./components/BurnoutHistoryChart";
import { TimeRangeFilter, TimeRange } from "./components/TimeRangeFilter";


export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "integrations" | "settings">("overview");
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  
  const currentRisk = useQuery(api.burnout.getCurrentRiskScore);
  const velocityMetrics = useQuery(api.linear.getVelocityMetrics, { days: 30 });
  const moodAnalytics = useQuery(api.webcam.getMoodAnalytics, { days: 7 });
  const workHours = useQuery(api.webcam.getWorkSessionAnalytics, { days: 7 });
  const burnoutHistory = useQuery(api.burnout.getBurnoutHistory, { days: 30 });
  const wakatimeAnalytics = useQuery(api.wakatime.getWakatimeAnalytics, { days: timeRange });
  
  const calculateBurnout = useAction(api.burnout.calculateBurnoutScore);

  // Auto-calculate burnout score every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      calculateBurnout().catch(console.error);
    }, 5 * 60 * 1000);

    // Calculate immediately on load
    calculateBurnout().catch(console.error);

    return () => clearInterval(interval);
  }, [calculateBurnout]);

  // Show browser notification if risk is high
  useEffect(() => {
    if (currentRisk?.riskScore && currentRisk.riskScore >= 75 && !currentRisk.notificationSent) {
      if (Notification.permission === "granted") {
        new Notification("TouchGrass Alert", {
          body: `Your burnout risk is ${currentRisk.riskScore}%. Time to take a break and touch some grass! 🌱`,
          icon: "/favicon.ico",
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("TouchGrass Alert", {
              body: `Your burnout risk is ${currentRisk.riskScore}%. Time to take a break and touch some grass! 🌱`,
              icon: "/favicon.ico",
            });
          }
        }).catch(console.error);
      }
    }
  }, [currentRisk]);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "integrations", label: "Integrations", icon: "🔗" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Burnout Prevention Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your well-being and work patterns</p>
        </div>

        <div className="flex items-center gap-4">
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
          <WebcamMonitor />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Risk Score */}
          <RiskScoreCard 
            riskScore={currentRisk?.riskScore || 0}
            factors={currentRisk?.factors}
            loading={currentRisk === undefined}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <VelocityChart
              data={velocityMetrics?.velocityData || []}
              loading={velocityMetrics === undefined}
            />

            <MoodChart
              data={moodAnalytics?.moodTrend || []}
              loading={moodAnalytics === undefined}
            />

            <WorkHoursChart
              data={workHours?.workHoursTrend || []}
              loading={workHours === undefined}
            />

          </div>

          {/* Wakatime Chart */}
          <WakatimeChart days={timeRange} />
          <CommitChart days={timeRange} />

          {/* Burnout History */}
          <BurnoutHistoryChart
            data={burnoutHistory || []}
            loading={burnoutHistory === undefined}
          />
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="space-y-6">
          <LinearIntegration />
          <WakatimeIntegration />

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">GitHub Commit Analysis</h3>
            <p className="text-gray-600 mb-4">
              Automatically analyzes your GitHub commit patterns to detect burnout indicators like
              late-night coding and weekend work.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active and analyzing</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Twelvelabs Webcam Integration</h3>
            <p className="text-gray-600 mb-4">
              Webcam monitoring is automatically enabled. The system analyzes your mood and presence
              in real-time using AI-powered video analysis.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active and monitoring</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <Settings />
      )}
    </div>
  );
}
