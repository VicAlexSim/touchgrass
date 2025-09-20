interface WorkHoursData {
  date: string;
  hours: number;
}

interface WorkHoursChartProps {
  data: WorkHoursData[];
  loading: boolean;
}

export function WorkHoursChart({ data, loading }: WorkHoursChartProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const maxHours = Math.max(...data.map(d => d.hours), 8);

  const getHoursColor = (hours: number) => {
    if (hours > 10) return "bg-red-500";
    if (hours > 8) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Work Hours</h3>
      
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">⏰</div>
          <p>No work hours data yet</p>
          <p className="text-sm">Start working to see your patterns</p>
        </div>
      ) : (
        <div className="h-32">
          <div className="flex items-end justify-between h-full space-x-1">
            {data.slice(-7).map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-full rounded-t ${getHoursColor(item.hours)}`}
                  style={{ height: `${(item.hours / maxHours) * 100}%` }}
                  title={`${item.hours} hours on ${item.date}`}
                />
                <span className="text-xs text-gray-500 mt-1">
                  {new Date(item.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Average: {(data.reduce((sum, d) => sum + d.hours, 0) / data.length).toFixed(1)} hours/day
        </div>
      )}
    </div>
  );
}
