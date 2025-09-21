import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

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
};

export function VelocityChart({ data, loading }: VelocityChartProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Format data for chart - show last 30 days and format dates nicely
  const chartData = data.slice(-30).map(item => ({
    ...item,
    dateDisplay: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  const totalPoints = data.reduce((sum, d) => sum + d.points, 0);
  const avgVelocity = data.length > 0 ? (totalPoints / data.length).toFixed(1) : "0";

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Story Points Velocity</h3>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-600">{totalPoints}</div>
            <div className="text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">{avgVelocity}</div>
            <div className="text-gray-500">Avg/Day</div>
          </div>
        </div>
      </div>
      
      {chartData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <h4 className="text-lg font-medium mb-2">No velocity data yet</h4>
          <p className="text-sm">Connect Linear to see your story points</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="dateDisplay" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => [
                    `${value} ${value === 1 ? 'point' : 'points'}`,
                    'Story Points'
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
              }
            />
            <Bar 
              dataKey="points" 
              fill="var(--color-points)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
