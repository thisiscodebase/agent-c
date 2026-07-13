export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(Math.round(tokens));
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0) {
    return "0m";
  }

  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = totalMinutes / 60;
  if (hours < 24) {
    const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
    return `${rounded}h`;
  }

  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function formatJoinedDaysAgo(createdAt: number, now = Date.now()): string {
  const days = Math.max(0, Math.floor((now - createdAt) / 86_400_000));
  if (days === 0) {
    return "Joined today";
  }
  if (days === 1) {
    return "Joined 1 day ago";
  }
  return `Joined ${days} days ago`;
}

export function formatCostUsd(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "$0";
  }
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  if (amount < 1) {
    return `$${amount.toFixed(3)}`;
  }
  if (amount < 100) {
    return `$${amount.toFixed(2)}`;
  }
  return `$${Math.round(amount).toLocaleString()}`;
}

export function formatChartDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) {
    return date;
  }
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
