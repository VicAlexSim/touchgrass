interface MoodData {
  date: string;
  averageMood: number;
}

interface MoodChartProps {
  data: MoodData[];
  loading: boolean;
}

export function MoodChart({ data, loading }: MoodChartProps) {
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

  const getMoodColor = (mood: number) => {
    if (mood >= 70) return "bg-green-500";
    if (mood >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Mood Average</h3>
      
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">😊</div>
          <p>No mood data yet</p>
          <p className="text-sm">Enable webcam monitoring to track mood</p>
        </div>
      ) : (
        <div className="h-32">
          <div className="flex items-end justify-between h-full space-x-1">
            {data.slice(-7).map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-full rounded-t ${getMoodColor(item.averageMood)}`}
                  style={{ height: `${item.averageMood}%` }}
                  title={`Mood: ${item.averageMood}/100 on ${item.date}`}
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
          Latest: {data[data.length - 1]?.averageMood || 0}/100
        </div>
      )}
    </div>
  );
}
