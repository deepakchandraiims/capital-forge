export const ROUTES = {
  Home: "/home",
  "Knowledge Vault": "/knowledge-vault",
  Practice: "/practice",
  Advanced: "/advanced",
  Dashboard: "/dashboard",
  Feedback: "/feedback",
  "Interview Room": "/interview",
  Cases: "/cases",
  Markets: "/markets",
  "Quick Math": "/practice/quick-math"
} as const;

export type RouteLabel = keyof typeof ROUTES;
export type PrimaryNavLabel = "Home" | "Knowledge Vault" | "Practice" | "Advanced" | "Dashboard" | "Feedback" | "Interview Room";

export const PRIMARY_NAV: readonly PrimaryNavLabel[] = [
  "Home", "Knowledge Vault", "Practice", "Advanced", "Dashboard", "Feedback", "Interview Room"
];

export const NAV_ICONS: Record<PrimaryNavLabel, string> = {
  Home: "⌂", "Knowledge Vault": "◇", Practice: "▣", Advanced: "▥",
  Dashboard: "▦", Feedback: "▱", "Interview Room": "▻"
};

export function routeForNav(label: string): string | undefined {
  return (ROUTES as Record<string, string>)[label];
}
