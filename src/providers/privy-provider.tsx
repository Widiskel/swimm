"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import type { PropsWithChildren } from "react";

const NEXT_PUBLIC_PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const providerConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "discord"],
  appearance: {
    theme: "dark",
    accentColor: "#0ea5e9",
    logo: "/file.svg",
  },
};

function PrivyBoundary({ children }: PropsWithChildren) {
  if (!NEXT_PUBLIC_PRIVY_APP_ID) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Privy app id belum dikonfigurasi. Login dinonaktifkan.");
    }
    return <>{children}</>;
  }

  return (
    <PrivyProvider appId={NEXT_PUBLIC_PRIVY_APP_ID} config={providerConfig}>
      {children}
    </PrivyProvider>
  );
}

export function PrivyAuthProvider({ children }: PropsWithChildren) {
  return <PrivyBoundary>{children}</PrivyBoundary>;
}
