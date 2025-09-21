import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { format, parseISO } from "date-fns";

interface VelocityData {
  date: string;
  points: number;
}

interface VelocityChartProps {
  data: VelocityData[];
  loading: boolean;
}

const chartConfig = {
  points: {
    label: "Story Points",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function VelocityChart({ data, loading }: VelocityChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Story Points Velocity</CardTitle>
          <CardDescription>Linear project velocity tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  // Format data for chart - show last 30 days and format dates nicely
  const chartData = data.slice(-30).map(item => ({
    ...item,
    formattedDate: format(parseISO(item.date), "MMM dd")
  }));

  const totalPoints = data.reduce((sum, d) => sum + d.points, 0);
  const avgVelocity = data.length > 0 ? (totalPoints / data.length).toFixed(1) : "0";

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Story Points Velocity</CardTitle>
          <CardDescription>Linear project velocity tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <span className="text-4xl mb-2 block">📊</span>
              <p className="font-medium">No velocity data yet</p>
              <p className="text-sm mt-1">Connect Linear to see your story points</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Story Points Velocity</CardTitle>
            <CardDescription>
              Linear project velocity tracking ({data.length} days)
            </CardDescription>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-blue-600 text-lg">{totalPoints}</div>
              <div className="text-muted-foreground text-xs">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600 text-lg">{avgVelocity}</div>
              <div className="text-muted-foreground text-xs">Avg/Day</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const value = payload[0].value;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[120px]">
                        <p className="font-semibold text-sm">{label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg">📊</span>
                          <div>
                            <p className="text-sm font-medium text-blue-600">
                              {value} {value === 1 ? 'point' : 'points'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Story Points
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="points" 
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
