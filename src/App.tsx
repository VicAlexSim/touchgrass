import { Authenticated, Unauthenticated } from "convex/react";
import { useAuth0 } from "@auth0/auth0-react";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./Dashboard";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🌱</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">TouchGrass</h2>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <Content />
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const { user, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Authenticated>
        <Dashboard />
      </Authenticated>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Prevent Developer Burnout
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              TouchGrass monitors your work patterns, mood, and velocity to help you
              maintain a healthy work-life balance and avoid burnout.
            </p>
          </div>

          <div className="w-full max-w-md">
            <SignInForm />
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                📊
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Linear Integration</h3>
              <p className="text-gray-600 text-sm">
                Track your velocity and story points to identify overwork patterns
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                📹
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mood Monitoring</h3>
              <p className="text-gray-600 text-sm">
                AI-powered webcam analysis to detect stress and fatigue levels
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                🔔
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Alerts</h3>
              <p className="text-gray-600 text-sm">
                Get notified when burnout risk is high and it's time to take a break
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
