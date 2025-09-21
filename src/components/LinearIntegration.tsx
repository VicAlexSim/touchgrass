import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export function LinearIntegration() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [teamsData, setTeamsData] = useState<any>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const connectProject = useMutation(api.linear.connectLinearProject);
  const syncData = useAction(api.linearActions.syncLinearData);
  const getLinearTeams = useAction(api.linearActions.getLinearTeams);
  const velocityMetrics = useQuery(api.linear.getVelocityMetrics, {});
  const connectedProjects = useQuery(api.linear.getConnectedProjects, {});

  const handleFetchTeams = async () => {
    if (!accessToken.trim()) {
      alert("Please enter your Linear API token first");
      return;
    }

    setIsLoadingTeams(true);
    try {
      const data = await getLinearTeams({ accessToken });
      setTeamsData(data);
      console.log("Fetched Linear teams:", data);
    } catch (error) {
      console.error("Error fetching teams:", error);
      alert("Failed to fetch teams. Please check your API token.");
      setTeamsData(null);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeamId) {
      alert("Please select a team");
      return;
    }

    // If the team has projects but none is selected, require selection
    const selectedTeam = teamsData?.teams.find((t: any) => t.id === selectedTeamId);
    if (selectedTeam?.projects?.length > 0 && !selectedProjectId) {
      alert("Please select a project from the available options");
      return;
    }

    setIsConnecting(true);

    try {
      if (!selectedTeam) {
        alert("Selected team not found");
        return;
      }

      const selectedProject = selectedProjectId ? selectedTeam?.projects.find((p: any) => p.id === selectedProjectId) : null;
      
      // If a project ID was provided but project not found, that's an error
      if (selectedProjectId && !selectedProject) {
        alert("Selected project not found");
        return;
      }

      await connectProject({
        projectId: selectedProjectId || `team-${selectedTeamId}`, // Use team-based ID if no project
        projectName: selectedProject?.name || `${selectedTeam.name} (Team-wide)`,
        teamId: selectedTeamId,
        teamName: selectedTeam.name,
        accessToken,
      });

      // Sync initial data
      await syncData({ projectId: selectedProjectId || `team-${selectedTeamId}` });

      // Clear form
      setAccessToken("");
      setTeamsData(null);
      setSelectedTeamId("");
      setSelectedProjectId("");

      alert("Linear integration connected successfully!");
    } catch (error) {
      console.error("Error connecting Linear:", error);
      alert("Failed to connect Linear. Please check your credentials.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!connectedProjects || connectedProjects.length === 0) {
      alert("No Linear projects connected. Please connect a project first.");
      return;
    }

    setIsSyncing(true);
    
    try {
      let totalSynced = 0;
      
      // Sync all connected projects
      for (const project of connectedProjects) {
        console.log(`Syncing project: ${project.projectName}`);
        const result = await syncData({ projectId: project.projectId });
        totalSynced += result.synced;
      }
      
      alert(`Successfully synced ${totalSynced} story points from ${connectedProjects.length} project(s)!`);
    } catch (error) {
      console.error("Error syncing data:", error);
      alert("Failed to sync data. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedTeam = teamsData?.teams.find((t: any) => t.id === selectedTeamId);
  const availableProjects = selectedTeam?.projects || [];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Linear Integration</h3>
      
      {connectedProjects && connectedProjects.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Connected</span>
          </div>
          
          {velocityMetrics && velocityMetrics.velocityData.length > 0 ? (
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
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <div className="text-yellow-700 mb-2">No velocity data yet</div>
              <div className="text-sm text-yellow-600">Click "Sync Latest Data" to fetch your story points</div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Connected: {connectedProjects?.map(p => p.projectName).join(", ")}
            </div>
            <button
              onClick={() => void handleSync()}
              disabled={isSyncing || !connectedProjects || connectedProjects.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? "Syncing..." : "Sync Latest Data"}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleConnect(e)} className="space-y-4">
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
              Get your API token from Linear Settings → API, then click "Fetch Teams"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value);
                  setSelectedProjectId(""); // Reset project selection
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Choose a team...</option>
                {teamsData?.teams.map((team: any) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={!selectedTeamId || availableProjects.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                required={availableProjects.length > 0}
              >
                <option value="">
                  {availableProjects.length === 0 && selectedTeamId 
                    ? "No projects available" 
                    : "Choose a project..."
                  }
                </option>
                {availableProjects.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add team discovery button and user info */}
          {!teamsData && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                Click "Fetch Teams" to automatically load your Linear teams and projects.
              </p>
              <button
                type="button"
                onClick={() => void handleFetchTeams()}
                disabled={!accessToken.trim() || isLoadingTeams}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoadingTeams ? "Loading..." : "Fetch Teams"}
              </button>
            </div>
          )}

          {teamsData && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">
                  Connected as {teamsData.viewer.displayName || teamsData.viewer.name}
                </span>
              </div>
              <p className="text-xs text-green-600">{teamsData.viewer.email}</p>
            </div>
          )}

          {selectedTeamId && availableProjects.length === 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                No projects found for this team. You can still connect without a specific project.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isConnecting || !selectedTeamId || !teamsData || (availableProjects.length > 0 && !selectedProjectId)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? "Connecting..." : "Connect Linear"}
          </button>
        </form>
      )}
    </div>
  );
}
