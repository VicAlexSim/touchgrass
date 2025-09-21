import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface BurnoutHistoryData {
  _id: string;
  date: string;
  riskScore: number;
}

interface BurnoutHistoryChartProps {
  data: BurnoutHistoryData[];
  loading: boolean;
}

export function BurnoutHistoryChart({ data, loading }: BurnoutHistoryChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Burnout Risk History</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Burnout Risk History</CardTitle>
          <CardDescription>No risk score history available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No burnout risk history yet</p>
            <p className="text-sm">Data will appear as risk scores are calculated</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for the chart - take the last 30 days
  const chartData = data.slice(-30).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    riskScore: item.riskScore,
    fullDate: item.date,
  }));

  const chartConfig = {
    riskScore: {
      label: "Risk Score",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  // Calculate recent trend
  const recentScores = data.slice(-7);
  const avgRecentScore = recentScores.reduce((sum, item) => sum + item.riskScore, 0) / recentScores.length;
  const trend = recentScores.length >= 2 ? 
    recentScores[recentScores.length - 1].riskScore - recentScores[0].riskScore : 0;

  const getRiskLevel = (score: number) => {
    if (score >= 75) return { level: "High", color: "text-red-600", bg: "bg-red-50" };
    if (score >= 50) return { level: "Medium", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { level: "Low", color: "text-green-600", bg: "bg-green-50" };
  };

  const currentRisk = getRiskLevel(avgRecentScore);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Burnout Risk History</CardTitle>
            <CardDescription>
              {data.length} risk assessments over the last {Math.min(30, data.length)} days
            </CardDescription>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentRisk.bg} ${currentRisk.color}`}>
            Recent Avg: {avgRecentScore.toFixed(0)}% ({currentRisk.level})
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {data[data.length - 1]?.riskScore || 0}%
            </div>
            <div className="text-sm text-gray-600">Current Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {avgRecentScore.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">7-Day Average</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${trend > 0 ? 'text-red-600' : trend < 0 ? 'text-green-600' : 'text-gray-600'}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Recent Trend</div>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                labelFormatter={(date) => `${date}`}
                formatter={(value: number) => [`${value}%`, "Risk Score"]}
              />
              <Area
                type="monotone"
                dataKey="riskScore"
                stroke="hsl(var(--chart-1))"
                fill="url(#riskGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Risk Level Indicators */}
        <div className="flex justify-center mt-4 space-x-6 text-xs text-gray-500">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
            Low Risk (0-49%)
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
            Medium Risk (50-74%)
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
            High Risk (75-100%)
          </div>
        </div>

        {/* Trend Insight */}
        {Math.abs(trend) > 5 && (
          <div className={`mt-4 p-3 rounded-lg ${trend > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <span className={trend > 0 ? 'text-red-400' : 'text-green-400'}>
                  {trend > 0 ? '⚠️' : '✅'}
                </span>
              </div>
              <div className="ml-3">
                <h4 className={`text-sm font-medium ${trend > 0 ? 'text-red-800' : 'text-green-800'}`}>
                  {trend > 0 ? 'Risk Trend Increasing' : 'Risk Trend Improving'}
                </h4>
                <div className={`mt-1 text-sm ${trend > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  Your burnout risk has {trend > 0 ? 'increased' : 'decreased'} by {Math.abs(trend).toFixed(0)}% recently.
                  {trend > 0 
                    ? ' Consider taking breaks and evaluating your workload.' 
                    : ' Keep up the good work maintaining your well-being!'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
