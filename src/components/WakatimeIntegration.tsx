import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Clock, Code, Calendar, TrendingUp, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

export function WakatimeIntegration() {
  const [apiKey, setApiKey] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState<string | null>(null);
  
  // Refresh modal state
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [refreshApiKey, setRefreshApiKey] = useState("");
  const [refreshEndpoint, setRefreshEndpoint] = useState("");

  const wakatimeAnalytics = useQuery(api.wakatime.getWakatimeAnalytics, { days: 7 });
  const wakatimeSettings = useQuery(api.wakatime.getWakatimeSettings);
  const fetchWakatimeData = useAction(api.wakatime.fetchWakatimeData);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your Wakatime API key");
      return;
    }

    setIsLoading(true);
    setError(null);
    setRefreshSuccess(null);

    try {
      await fetchWakatimeData({
        apiKey: apiKey.trim(),
        range: "last_7_days",
        endpoint: customEndpoint.trim() || undefined,
      });

      // Clear API key from state for security
      setApiKey("");
      setCustomEndpoint("");
      setRefreshSuccess("Successfully connected to Wakatime!");
    } catch (err) {
      setError("Failed to connect to Wakatime. Please check your API key and try again.");
      console.error("Wakatime connection error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!wakatimeAnalytics?.isConnected || !wakatimeSettings) return;

    setIsRefreshing(true);
    setError(null);
    setRefreshSuccess(null);

    try {
      // First, try with stored credentials
      await fetchWakatimeData({
        apiKey: wakatimeSettings.apiKey,
        range: "last_7_days",
        endpoint: wakatimeSettings.endpoint || undefined,
      });

      setRefreshSuccess(`Data refreshed successfully at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error("Wakatime refresh error:", err);
      // If stored credentials fail, show modal for manual entry
      setError("Stored credentials may be invalid. Please enter your credentials to refresh.");
      setShowRefreshModal(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshSubmit = async () => {
    if (!refreshApiKey.trim()) {
      setError("API key is required to refresh data");
      return;
    }

    setIsRefreshing(true);
    setError(null);
    setRefreshSuccess(null);

    try {
      await fetchWakatimeData({
        apiKey: refreshApiKey.trim(),
        range: "last_7_days",
        endpoint: refreshEndpoint.trim() || undefined,
      });

      setRefreshSuccess(`Data refreshed successfully at ${new Date().toLocaleTimeString()}`);
      setShowRefreshModal(false);
      setRefreshApiKey("");
      setRefreshEndpoint("");
    } catch (err) {
      setError("Failed to refresh Wakatime data. Please check your API key and try again.");
      console.error("Wakatime refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (wakatimeAnalytics?.isConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Wakatime Integration
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRefresh()}
                  disabled={isRefreshing}
                  className="h-7"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Track your coding time and patterns to prevent burnout
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(error || refreshSuccess) && (
              <div className="mb-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {refreshSuccess && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{refreshSuccess}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {wakatimeAnalytics.lastSync && (
              <div className="text-sm text-gray-600 mb-4">
                Last synced: {new Date(wakatimeAnalytics.lastSync).toLocaleString()}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatTime(wakatimeAnalytics.totalCodingTime)}
                </div>
                <div className="text-sm text-gray-600">Total Coding Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(wakatimeAnalytics.averageDailyCodingTime)}
                </div>
                <div className="text-sm text-gray-600">Daily Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {wakatimeAnalytics.codingTrend.length}
                </div>
                <div className="text-sm text-gray-600">Days Tracked</div>
              </div>
            </div>

            <div className="space-y-4">
          
              {wakatimeAnalytics.mostUsedLanguages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Most Used Languages
                  </h4>
                  <div className="space-y-2">
                    {wakatimeAnalytics.mostUsedLanguages.map((language, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{language.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${language.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {formatTime(language.time)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {wakatimeAnalytics.mostUsedProjects.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Most Used Projects
                  </h4>
                  <div className="space-y-2">
                    {wakatimeAnalytics.mostUsedProjects.map((project, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{project.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${project.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {formatTime(project.time)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Refresh Modal */}
        <Dialog open={showRefreshModal} onOpenChange={setShowRefreshModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refresh Wakatime Data</DialogTitle>
              <DialogDescription>
                Your stored credentials may be invalid. Please re-enter your Wakatime credentials to refresh data.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refreshApiKey">Wakatime API Key</Label>
                <Input
                  id="refreshApiKey"
                  type="password"
                  placeholder="Enter your Wakatime API key"
                  value={refreshApiKey}
                  onChange={(e) => setRefreshApiKey(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refreshEndpoint">Custom API Endpoint (Optional)</Label>
                <Input
                  id="refreshEndpoint"
                  placeholder="https://your-custom-wakatime-instance.com/api/v1"
                  value={refreshEndpoint}
                  onChange={(e) => setRefreshEndpoint(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefreshModal(false);
                  setRefreshApiKey("");
                  setRefreshEndpoint("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleRefreshSubmit()}
                disabled={isRefreshing || !refreshApiKey.trim()}
              >
                {isRefreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Wakatime Integration
        </CardTitle>
        <CardDescription>
          Connect your Wakatime account to track coding time and prevent burnout through work pattern analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(error || refreshSuccess) && (
          <div className="space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {refreshSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{refreshSuccess}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="apiKey">Wakatime API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Enter your Wakatime API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-gray-600">
            Find your API key in Wakatime Settings → Account
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endpoint">Custom API Endpoint (Optional)</Label>
          <Input
            id="endpoint"
            placeholder="https://your-custom-wakatime-instance.com/api/v1"
            value={customEndpoint}
            onChange={(e) => setCustomEndpoint(e.target.value)}
          />
          <p className="text-xs text-gray-600">
            Leave empty to use the official Wakatime API
          </p>
        </div>

        <div className="space-y-2">
          <Label>Features</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Daily coding time tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Language usage analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Project time distribution</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Burnout pattern detection</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => void handleConnect()}
          disabled={isLoading || !apiKey.trim()}
          className="w-full"
        >
          {isLoading ? "Connecting..." : "Connect Wakatime"}
        </Button>
      </CardContent>
    </Card>
  );
}