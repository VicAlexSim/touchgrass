import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChartConfig, ChartContainer, ChartTooltip } from "./ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";

interface DailyMoodData {
  date: string;
  averageMood: number;
}

interface DailyMoodChartProps {
  data: DailyMoodData[];
  loading?: boolean;
}

const chartConfig = {
  averageMood: {
    label: "Average Mood",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function DailyMoodChart({ data, loading }: DailyMoodChartProps) {
  // Transform data for chart display
  const chartData = data.map((item) => ({
    ...item,
    formattedDate: format(parseISO(item.date), "MMM dd"),
    // Convert -3 to 3 scale to 0 to 6 scale for better visualization
    moodScore: item.averageMood + 3,
    originalMood: item.averageMood,
  }));

  const getMoodColor = (mood: number) => {
    if (mood >= 2) return "hsl(142, 76%, 36%)"; // Green - Happy
    if (mood >= 1) return "hsl(47, 96%, 53%)";  // Yellow - Content
    if (mood >= 0) return "hsl(43, 74%, 66%)";  // Light Orange - Neutral
    if (mood >= -1) return "hsl(25, 95%, 53%)"; // Orange - Tired
    if (mood >= -2) return "hsl(0, 84%, 60%)";  // Red - Stressed
    return "hsl(0, 72%, 51%)"; // Dark Red - Very negative
  };

  const getMoodLabel = (mood: number): string => {
    if (mood >= 2) return "Very Happy";
    if (mood >= 1) return "Happy";
    if (mood >= 0) return "Neutral";
    if (mood >= -1) return "Tired";
    if (mood >= -2) return "Stressed";
    return "Very Stressed";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Mood Trends</CardTitle>
          <CardDescription>AI-powered mood analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Mood Trends</CardTitle>
          <CardDescription>AI-powered mood analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <span className="text-4xl mb-2 block">😐</span>
              <p>No mood data available yet</p>
              <p className="text-sm mt-1">Start webcam monitoring to see trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Mood Trends</CardTitle>
        <CardDescription>
          AI-powered mood analysis ({data.length} days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 30,
                bottom: 20,
              }}
            >
              <defs>
                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 6]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                width={80}
                tickFormatter={(value) => {
                  const mood = value - 3;
                  if (mood >= 2) return "😊 Great";
                  if (mood >= 1) return "🙂 Good";
                  if (mood >= 0) return "😐 OK";
                  if (mood >= -1) return "😔 Tired";
                  if (mood >= -2) return "😰 Bad";
                  return "😵 Awful";
                }}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const moodEmoji = data.originalMood >= 2 ? "😊" : 
                                     data.originalMood >= 1 ? "🙂" :
                                     data.originalMood >= 0 ? "😐" :
                                     data.originalMood >= -1 ? "😔" :
                                     data.originalMood >= -2 ? "😰" : "😵";
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[120px]">
                        <p className="font-semibold text-sm">{label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg">{moodEmoji}</span>
                          <div>
                            <p className="text-sm font-medium" style={{ color: getMoodColor(data.originalMood) }}>
                              {getMoodLabel(data.originalMood)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Score: {data.originalMood > 0 ? '+' : ''}{data.originalMood}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="moodScore"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMood)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
