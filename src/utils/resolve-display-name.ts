import type { User as PrivyUser } from "@privy-io/react-auth";

const shorten = (value: string) => {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

export const resolveDisplayName = (
  user: PrivyUser | null,
  settingsDisplayName?: string | null
): string | null => {
  const trimmedSetting = settingsDisplayName?.trim();
  if (trimmedSetting) {
    return trimmedSetting;
  }

  if (!user) {
    return null;
  }

  if (user.email?.address) {
    return user.email.address;
  }

  const raw = (user as unknown as {
    linkedAccounts?: Array<Record<string, unknown>>;
    linked_accounts?: Array<Record<string, unknown>>;
  }) ?? {};

  const linkedAccounts = Array.isArray(raw.linkedAccounts)
    ? raw.linkedAccounts
    : Array.isArray(raw.linked_accounts)
    ? raw.linked_accounts
    : [];

  const findAccount = (predicate: (account: Record<string, unknown>) => boolean) =>
    linkedAccounts.find((account) => predicate(account ?? {})) ?? null;

  const emailAccount = findAccount((account) => account.type === "email");
  if (emailAccount && typeof (emailAccount as { address?: string }).address === "string") {
    return (emailAccount as { address?: string }).address as string;
  }

  const googleAccount = findAccount(
    (account) => typeof account.type === "string" && account.type.includes("google")
  ) as { email?: string; name?: string } | null;
  if (googleAccount?.name) {
    return googleAccount.name;
  }
  if (googleAccount?.email) {
    return googleAccount.email;
  }

  const discordAccount = findAccount(
    (account) => typeof account.type === "string" && account.type.includes("discord")
  ) as { username?: string } | null;
  if (discordAccount?.username) {
    return discordAccount.username;
  }

  const walletAddress =
    user.wallet?.address ||
    (linkedAccounts.find((account) => account.type === "wallet") as { address?: string } | null)
      ?.address;
  if (walletAddress && typeof walletAddress === "string") {
    return shorten(walletAddress);
  }

  if (user.phone?.number) {
    return user.phone.number;
  }

  if (user.farcaster?.username) {
    return `@${user.farcaster.username}`;
  }

  if (user.id) {
    return user.id;
  }

  return null;
};
