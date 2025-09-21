import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Clock, Code, Calendar, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

import { TimeRange } from "./TimeRangeFilter";

interface WakatimeChartProps {
  days?: TimeRange;
}

export function WakatimeChart({ days = 7 }: WakatimeChartProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshApiKey, setRefreshApiKey] = useState("");
  const [refreshEndpoint, setRefreshEndpoint] = useState("");
  
  const wakatimeAnalytics = useQuery(api.wakatime.getWakatimeAnalytics, { days });
  const wakatimeSettings = useQuery(api.wakatime.getWakatimeSettings);
  const fetchWakatimeData = useAction(api.wakatime.fetchWakatimeData);

  const handleRefresh = async () => {
    if (!wakatimeAnalytics?.isConnected || !wakatimeSettings) return;

    setIsRefreshing(true);

    try {
      // First, try with stored credentials
      await fetchWakatimeData({
        apiKey: wakatimeSettings.apiKey,
        range: days === 7 ? "last_7_days" : "last_30_days",
        endpoint: wakatimeSettings.endpoint || undefined,
      });
    } catch (err) {
      console.error("Wakatime refresh error:", err);
      // If stored credentials fail, show modal for manual entry
      setShowRefreshModal(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshSubmit = async () => {
    if (!refreshApiKey.trim()) {
      return;
    }

    setIsRefreshing(true);

    try {
      await fetchWakatimeData({
        apiKey: refreshApiKey.trim(),
        range: days === 7 ? "last_7_days" : "last_30_days",
        endpoint: refreshEndpoint.trim() || undefined,
      });

      setShowRefreshModal(false);
      setRefreshApiKey("");
      setRefreshEndpoint("");
    } catch (err) {
      console.error("Wakatime refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getRiskLevel = (dailyHours: number) => {
    if (dailyHours > 10) return { level: "high", color: "red", text: "High Risk" };
    if (dailyHours > 8) return { level: "medium", color: "yellow", text: "Medium Risk" };
    if (dailyHours > 6) return { level: "moderate", color: "orange", text: "Moderate Risk" };
    if (dailyHours < 1) return { level: "low", color: "blue", text: "Low Activity" };
    return { level: "good", color: "green", text: "Good" };
  };

  if (!wakatimeAnalytics?.isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Wakatime Coding Time
          </CardTitle>
          <CardDescription>
            Connect Wakatime to track your coding patterns and prevent burnout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>Wakatime not connected</p>
            <p className="text-sm">Go to Integrations tab to connect your Wakatime account</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestDay = wakatimeAnalytics.codingTrend[wakatimeAnalytics.codingTrend.length - 1];
  const currentRisk = latestDay ? getRiskLevel(latestDay.hours) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Wakatime Coding Time
          {currentRisk && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              currentRisk.color === "red" ? "bg-red-100 text-red-700" :
              currentRisk.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
              currentRisk.color === "orange" ? "bg-orange-100 text-orange-700" :
              currentRisk.color === "blue" ? "bg-blue-100 text-blue-700" :
              "bg-green-100 text-green-700"
            }`}>
              {currentRisk.text}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="ml-auto h-6"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardTitle>
        <CardDescription>
          Track your coding time and patterns to maintain healthy work habits
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {formatTime(wakatimeAnalytics.totalCodingTime)}
            </div>
            <div className="text-xs text-gray-600">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {formatTime(wakatimeAnalytics.averageDailyCodingTime)}
            </div>
            <div className="text-xs text-gray-600">Daily Average</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              {wakatimeAnalytics.codingTrend.length}
            </div>
            <div className="text-xs text-gray-600">Days Tracked</div>
          </div>
        </div>

        {/* Coding Trend Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Daily Coding Trend
          </h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-end gap-1 h-24">
              {wakatimeAnalytics.codingTrend.slice(-days).map((day, index) => {
                const maxHeight = 96;
                const maxHours = Math.max(...wakatimeAnalytics.codingTrend.map(d => d.hours), 1);
                const height = (day.hours / maxHours) * maxHeight;
                const risk = getRiskLevel(day.hours);

                return (
                  <div key={index} className="flex-1 flex flex-col items-center min-w-[20px]">
                    <div className="text-xs text-gray-500 mb-1">
                      {Math.round(day.hours * 10) / 10}h
                    </div>
                    <div
                      className={`w-full rounded-t cursor-pointer transition-all hover:opacity-80 ${
                        risk.color === "red" ? "bg-red-500" :
                        risk.color === "yellow" ? "bg-yellow-500" :
                        risk.color === "orange" ? "bg-orange-500" :
                        risk.color === "blue" ? "bg-blue-500" :
                        "bg-green-500"
                      }`}
                      style={{ height: `${Math.max(height, 4)}px` }}
                      title={`${formatDate(day.date)}: ${formatTime(day.hours * 3600)} (${risk.text})`}
                    />
                    <div className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                      {formatDate(day.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Languages and Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wakatimeAnalytics.mostUsedLanguages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Top Languages
              </h4>
              <div className="space-y-1">
                {wakatimeAnalytics.mostUsedLanguages.slice(0, 3).map((language, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate">{language.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(language.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-600 min-w-[30px] text-right">
                        {formatTime(language.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wakatimeAnalytics.mostUsedProjects.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Top Projects
              </h4>
              <div className="space-y-1">
                {wakatimeAnalytics.mostUsedProjects.slice(0, 3).map((project, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate">{project.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(project.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-600 min-w-[30px] text-right">
                        {formatTime(project.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk Indicators */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-green-500 rounded"></div>
              <span>2-6h/day - Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded"></div>
              <span>6-8h/day - Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-yellow-500 rounded"></div>
              <span>8-10h/day - High risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-red-500 rounded"></div>
              <span>10+h/day - Very high</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Refresh Modal */}
      <Dialog open={showRefreshModal} onOpenChange={setShowRefreshModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refresh Wakatime Data</DialogTitle>
            <DialogDescription>
              Unable to refresh with stored credentials. Please re-enter your Wakatime credentials.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refreshApiKey">Wakatime API Key</Label>
              <Input
                id="refreshApiKey"
                type="password"
                placeholder="Enter your Wakatime API key"
                value={refreshApiKey}
                onChange={(e) => setRefreshApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshEndpoint">Custom API Endpoint (Optional)</Label>
              <Input
                id="refreshEndpoint"
                placeholder="https://your-custom-wakatime-instance.com/api/v1"
                value={refreshEndpoint}
                onChange={(e) => setRefreshEndpoint(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRefreshModal(false);
                setRefreshApiKey("");
                setRefreshEndpoint("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleRefreshSubmit()}
              disabled={isRefreshing || !refreshApiKey.trim()}
            >
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}