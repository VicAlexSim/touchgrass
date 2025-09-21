import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth0 } from "@auth0/auth0-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { Button } from "./ui/button";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, Cell } from "recharts";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TimeRange } from "./TimeRangeFilter";

interface CommitChartProps {
  days?: TimeRange;
}

export function CommitChart({ days = 7 }: CommitChartProps) {
  const { user } = useAuth0();
  const githubUsername = user?.nickname || user?.name;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const commitAnalytics = useQuery(api.github.getGitHubCommitAnalytics, { days });
  const fetchCommits = useAction(api.github.fetchGitHubCommits);

  const handleRefresh = async () => {
    if (!githubUsername) return;

    setIsRefreshing(true);

    try {
      console.log(`Manual refresh for user: ${githubUsername} - fetching recent commits`);
      const result = await fetchCommits({ username: githubUsername, days: Math.max(days, 60) });
      console.log('Fetch result:', result);
      console.log(`Fetched ${result.totalCommits} commits - data should update shortly`);
    } catch (error) {
      console.error('GitHub refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch commits on component mount if we have a username
  useEffect(() => {
    console.log('CommitChart effect:', {
      githubUsername,
      hasAnalytics: !!commitAnalytics,
      totalCommits: commitAnalytics?.totalCommits
    });

    if (githubUsername && commitAnalytics && commitAnalytics.totalCommits === 0) {
      console.log(`Fetching commits for GitHub user: ${githubUsername}`);
      void fetchCommits({ username: githubUsername, days: Math.max(days, 365) });
    }
  }, [githubUsername, fetchCommits, commitAnalytics, days]);

  if (!githubUsername) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">GitHub Commit Patterns</h3>
        <p className="text-gray-600">
          Connect your GitHub account to see commit pattern analytics that can help identify burnout risk factors.
        </p>
      </div>
    );
  }

  console.log('CommitChart render:', { commitAnalytics });

  if (!commitAnalytics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">GitHub Commit Patterns</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="text-sm text-gray-500 mt-2">Loading analytics...</div>
        </div>
      </div>
    );
  }

  const { weeklyPattern, hourlyPattern, lateNightCommits, weekendCommits, totalCommits, averageCommitsPerDay, recentCommitTrend } = commitAnalytics;

  // Prepare data for charts
  const weeklyData = Object.entries(weeklyPattern).map(([day, commits]) => ({
    day: day.slice(0, 3),
    commits: commits as number,
  }));

  const hourlyData = Object.entries(hourlyPattern).map(([hour, commits]) => ({
    hour: parseInt(hour),
    commits: commits as number,
    isLateNight: parseInt(hour) >= 22 || parseInt(hour) <= 6,
  }));

  const recentTrendData = recentCommitTrend.map((day) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    commits: day.commits,
    fullDate: day.date,
  }));

  const chartConfig = {
    commits: {
      label: "Commits",
      color: "hsl(var(--chart-1))",
    },
    lateNight: {
      label: "Late Night",
      color: "hsl(var(--destructive))",
    },
    normal: {
      label: "Normal Hours", 
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>GitHub Commit Patterns</CardTitle>
          {totalCommits > 0 && (
            <CardDescription>
              {totalCommits} commits analyzed
              {Math.max(...recentCommitTrend.map(d => d.commits)) === 0 && (
                <span className="text-orange-600 font-medium ml-2">
                  ⚠️ No commits in last {days} days
                </span>
              )}
            </CardDescription>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing || !githubUsername}
          className="h-6"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalCommits}</div>
            <div className="text-sm text-gray-600">Total Commits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{averageCommitsPerDay.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg/Day</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{lateNightCommits}</div>
            <div className="text-sm text-gray-600">Late Night</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{weekendCommits}</div>
            <div className="text-sm text-gray-600">Weekends</div>
          </div>
        </div>

        {/* Charts Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Weekly Pattern Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Commits by Day of Week</h4>
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="commits" fill="var(--color-commits)" />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Hourly Pattern Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Commits by Hour of Day</h4>
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(hour) => `${hour}:00`}
                />
                <Bar dataKey="commits">
                  {hourlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isLateNight ? "hsl(var(--destructive))" : "hsl(var(--chart-2))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="flex justify-center mt-2 space-x-3 text-xs text-gray-500">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded mr-1"></div>
                Normal Hours
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded mr-1"></div>
                Late Night (10 PM - 6 AM)
              </div>
            </div>
          </div>
        </div>

        {/* Recent Commit Trend Chart - Full Width */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Commit Trend (Last {days} Days)</h4>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <LineChart data={recentTrendData}>
              <XAxis 
                dataKey="date" 
                interval="preserveStartEnd"
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(date) => `${date}`}
              />
              <Line 
                type="monotone" 
                dataKey="commits" 
                stroke="var(--color-commits)" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
          
          {Math.max(...recentCommitTrend.map(d => d.commits)) === 0 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              No commits in the last {days} days. Consider checking your repository activity.
            </p>
          )}
        </div>

        {/* Risk Insights */}
        {(lateNightCommits > 5 || weekendCommits > 3) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Potential Burnout Indicators</h4>
                <div className="mt-1 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {lateNightCommits > 5 && (
                      <li>{lateNightCommits} late night commits detected (after 10 PM)</li>
                    )}
                    {weekendCommits > 3 && (
                      <li>{weekendCommits} weekend commits - consider setting boundaries</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
