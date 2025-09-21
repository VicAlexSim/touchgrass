interface RiskScoreCardProps {
  riskScore: number;
  factors?: {
    velocityScore: number;
    moodScore: number;
    workHoursScore: number;
    breakScore: number;
    commitPatternsScore?: number;
  };
  loading: boolean;
}

export function RiskScoreCard({ riskScore, factors, loading }: RiskScoreCardProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-16 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const getRiskLevel = (score: number) => {
    if (score >= 75) return { level: "High", color: "text-red-600", bg: "bg-red-100" };
    if (score >= 50) return { level: "Medium", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { level: "Low", color: "text-green-600", bg: "bg-green-100" };
  };

  const risk = getRiskLevel(riskScore);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Burnout Risk Score</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${risk.bg} ${risk.color}`}>
          {risk.level} Risk
        </div>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - riskScore / 100)}`}
              className={
                riskScore >= 75 ? "text-red-500" :
                riskScore >= 50 ? "text-yellow-500" : "text-green-500"
              }
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{riskScore}</span>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {riskScore >= 75 ? "Time to Take a Break!" :
             riskScore >= 50 ? "Monitor Your Patterns" : "You're Doing Great!"}
          </h3>
          <p className="text-gray-600">
            {riskScore >= 75 ? "Your burnout risk is high. Consider taking a break, going for a walk, or touching some grass! 🌱" :
             riskScore >= 50 ? "Keep an eye on your work patterns and make sure to take regular breaks." :
             "Your work-life balance looks healthy. Keep up the good work!"}
          </p>
        </div>
      </div>

      {factors && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{factors.velocityScore}</div>
            <div className="text-xs text-gray-600">Velocity</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{factors.moodScore}</div>
            <div className="text-xs text-gray-600">Mood</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{factors.workHoursScore}</div>
            <div className="text-xs text-gray-600">Work Hours</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{Math.round(factors.commitPatternsScore ?? 0)}</div>
            <div className="text-xs text-gray-600">Git Patterns</div>
          </div>
        </div>
      )}
    </div>
  );
}
