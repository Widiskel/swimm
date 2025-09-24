"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { PropsWithChildren } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const providerConfig = {
  loginMethods: ["email", "wallet"],
  embeddedWallets: {
    createOnLogin: "users-without-wallets" as const,
  },
};

const providerAppearance = {
  theme: "dark" as const,
  accentColor: "#0ea5e9",
  logo: "/file.svg",
};

function PrivyBoundary({ children }: PropsWithChildren) {
  if (!PRIVY_APP_ID) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Privy app id belum dikonfigurasi. Login dinonaktifkan.");
    }
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={providerConfig}
      appearance={providerAppearance}
    >
      {children}
    </PrivyProvider>
  );
}

export function PrivyAuthProvider({ children }: PropsWithChildren) {
  return <PrivyBoundary>{children}</PrivyBoundary>;
}
