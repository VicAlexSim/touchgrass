"use client";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "sonner";

export function SignInForm() {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleSignIn = () => {
    void loginWithRedirect({
      authorizationParams: {
        screen_hint: "login",
      },
    }).catch((error) => {
      toast.error("Could not sign in. Please try again.");
      console.error("Login error:", error);
    });
  };

  const handleSignUp = () => {
    void loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
      },
    }).catch((error) => {
      toast.error("Could not sign up. Please try again.");
      console.error("Signup error:", error);
    });
  };

  return (
    <div className="w-full space-y-4">
      <button
        className="w-full auth-button"
        onClick={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign in with Auth0"}
      </button>

      <div className="flex justify-center items-center text-sm text-gray-600">
        <span>Don't have an account? </span>
        <button
          type="button"
          className="ml-1 text-green-600 hover:text-green-700 hover:underline font-medium cursor-pointer"
          onClick={handleSignUp}
          disabled={isLoading}
        >
          Sign up instead
        </button>
      </div>
    </div>
  );
}
