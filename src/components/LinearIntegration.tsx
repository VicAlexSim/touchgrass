import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function LinearIntegration() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");

  const connectProject = useMutation(api.linear.connectLinearProject);
  const syncData = useAction(api.linear.syncLinearData);
  const velocityMetrics = useQuery(api.linear.getVelocityMetrics, {});

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);

    try {
      await connectProject({
        projectId,
        projectName,
        teamId,
        teamName,
        accessToken,
      });

      // Sync initial data
      await syncData({ projectId });

      // Clear form
      setAccessToken("");
      setProjectId("");
      setProjectName("");
      setTeamId("");
      setTeamName("");

      alert("Linear integration connected successfully!");
    } catch (error) {
      console.error("Error connecting Linear:", error);
      alert("Failed to connect Linear. Please check your credentials.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!projectId) return;
    
    try {
      await syncData({ projectId });
      alert("Data synced successfully!");
    } catch (error) {
      console.error("Error syncing data:", error);
      alert("Failed to sync data. Please try again.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Linear Integration</h3>
      
      {velocityMetrics && velocityMetrics.velocityData.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Connected</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{velocityMetrics.totalPoints}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{velocityMetrics.averageVelocity.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Velocity</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${velocityMetrics.currentTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {velocityMetrics.currentTrend >= 0 ? '+' : ''}{velocityMetrics.currentTrend.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Trend</div>
            </div>
          </div>
          
          <button
            onClick={handleSync}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Sync Latest Data
          </button>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Linear API Token
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="lin_api_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your API token from Linear Settings → API
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team ID
              </label>
              <input
                type="text"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="team_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Name
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Engineering"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="project_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="TouchGrass"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? "Connecting..." : "Connect Linear"}
          </button>
        </form>
      )}
    </div>
  );
}
