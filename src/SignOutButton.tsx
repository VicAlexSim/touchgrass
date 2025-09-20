"use client";
import { useAuth0 } from "@auth0/auth0-react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { logout } = useAuth0();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-4 py-2 rounded bg-white text-secondary border border-gray-200 font-semibold hover:bg-gray-50 hover:text-secondary-hover transition-colors shadow-sm hover:shadow"
      onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
    >
      Sign out
    </button>
  );
}
