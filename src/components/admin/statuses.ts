export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  quoted: "Quoted",
  agent_followup: "Needs agent",
  sold_lead: "Lead sold",
  bound: "Policy sold",
  unsold: "Closed, not sold",
};

export const STATUS_STYLES: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  quoted: "bg-blue-50 text-blue-700",
  agent_followup: "bg-amber-50 text-amber-800",
  sold_lead: "bg-violet-50 text-violet-700",
  bound: "bg-emerald-50 text-emerald-700",
  unsold: "bg-gray-100 text-gray-600",
};

// Colours for the status bar on the dashboard.
export const STATUS_COLORS: Record<string, string> = {
  new: "#94A3B8",
  quoted: "#1F5FAD",
  agent_followup: "#F59E0B",
  sold_lead: "#7C3AED",
  bound: "#10B981",
  unsold: "#CBD5E1",
};
