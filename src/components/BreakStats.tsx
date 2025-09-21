import React from "react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Clock, Coffee, AlertTriangle, CheckCircle } from "lucide-react";



export const BreakStats: React.FC = () => {
  const todayStats = useQuery(api.breaks.getTodayBreakStats);
  const analytics = useQuery(api.breaks.getBreakAnalytics, { days: 7 });

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getBreakStatusColor = (breaksPerHour: number): string => {
    if (breaksPerHour < 0.3) return "text-red-600";
    if (breaksPerHour < 0.5) return "text-orange-600";
    if (breaksPerHour < 1) return "text-yellow-600";
    return "text-green-600";
  };

  const getBreakStatusIcon = (breaksPerHour: number) => {
    if (breaksPerHour < 0.3) return <AlertTriangle className="w-4 h-4" />;
    if (breaksPerHour < 0.5) return <AlertTriangle className="w-4 h-4" />;
    if (breaksPerHour < 1) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  if (!todayStats || !analytics) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Break Analysis & Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {analytics.averageBreaksPerDay}
              </div>
              <div className="text-sm text-blue-600">Avg Breaks/Day</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {formatDuration(analytics.averageBreakMinutes)}
              </div>
              <div className="text-sm text-green-600">Avg Break Duration</div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {analytics.breaksPerWorkHour}
              </div>
              <div className="text-sm text-purple-600">Breaks/Hour</div>
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">7-Day Trend</h4>
            {analytics.breakTrend.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="font-medium text-gray-700">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Coffee className="w-4 h-4" />
                    <span>{day.breakCount} breaks</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDuration(day.breakMinutes)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`text-sm font-medium ${getBreakStatusColor(day.breaksPerHour)}`}>
                    {day.breaksPerHour.toFixed(1)}/hour
                  </div>
                  {getBreakStatusIcon(day.breaksPerHour)}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Recommendations
            </h4>
            
            {analytics.breaksPerWorkHour < 0.5 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800">Take More Breaks</div>
                    <div className="text-sm text-red-700">
                      You're averaging {analytics.breaksPerWorkHour.toFixed(1)} breaks per hour.
                      Aim for at least 1 break per hour to maintain productivity and reduce burnout risk.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analytics.averageBreakMinutes < 5 && analytics.totalBreaks > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800">Longer Breaks</div>
                    <div className="text-sm text-yellow-700">
                      Your average break is {formatDuration(analytics.averageBreakMinutes)}.
                      Consider taking longer breaks (5-10 minutes) for better recovery.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analytics.breaksPerWorkHour >= 1 && analytics.averageBreakMinutes >= 5 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800">Great Break Habits!</div>
                    <div className="text-sm text-green-700">
                      You're maintaining healthy break patterns. Keep up the good work!
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};