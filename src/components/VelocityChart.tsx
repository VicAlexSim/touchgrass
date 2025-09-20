interface VelocityData {
  date: string;
  points: number;
}

interface VelocityChartProps {
  data: VelocityData[];
  loading: boolean;
}

export function VelocityChart({ data, loading }: VelocityChartProps) {
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

  const maxPoints = Math.max(...data.map(d => d.points), 1);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Story Points Velocity</h3>
      
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>No velocity data yet</p>
          <p className="text-sm">Connect Linear to see your story points</p>
        </div>
      ) : (
        <div className="h-32">
          <div className="flex items-end justify-between h-full space-x-1">
            {data.slice(-14).map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(item.points / maxPoints) * 100}%` }}
                  title={`${item.points} points on ${item.date}`}
                />
                <span className="text-xs text-gray-500 mt-1">
                  {new Date(item.date).getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Total: {data.reduce((sum, d) => sum + d.points, 0)} points
        </div>
      )}
    </div>
  );
}
