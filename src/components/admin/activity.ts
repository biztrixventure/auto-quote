import { money } from "./ui";
import { STATUS_LABELS } from "./statuses";

/** Events that mean something went wrong; shown in red and in "errors only". */
export const ERROR_ACTIONS = ["rater_error", "distribution_error", "routing_failed", "notification_failed", "sign_in_failed", "2fa_failed"];

const SIMPLE: Record<string, string> = {
  duplicate_submission: "Submitted the form again (duplicate)",
  agent_followup: "Flagged for agent follow-up",
  export_csv: "Exported leads to CSV",
  note_added: "Note added",
  dnc_added: "Marked do not contact",
  dnc_removed: "Do-not-contact removed",
  signed_in: "Signed in",
  signed_out: "Signed out",
  sign_in_failed: "Failed sign-in attempt",
  "2fa_failed": "Wrong two-factor code",
  "2fa_enabled": "Turned on two-factor",
  "2fa_disabled": "Turned off two-factor",
  password_changed: "Changed their password",
  sessions_revoked: "Signed out of other devices",
  owner_created: "Owner account created",
  privacy_export: "Exported a person's data",
  privacy_delete: "Deleted a person's data",
  dnc_list_added: "Added to do-not-contact list",
  dnc_list_removed: "Removed from do-not-contact list",
  media_deleted: "Deleted an image",
  menus_updated: "Updated the website menus",
  legal_updated: "Updated legal pages or privacy settings",
  privacy_request_updated: "Updated a privacy request",
  profile_updated: "Updated their author profile",
};

const capital = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

/** Turns an audit-log entry into a readable line. */
export function describe(action: string, detail: string | null): { text: string; error?: boolean } {
  let d: Record<string, unknown> = {};
  try {
    d = detail ? (JSON.parse(detail) as Record<string, unknown>) : {};
  } catch {}
  const str = (k: string) => (typeof d[k] === "string" && d[k] ? (d[k] as string) : null);
  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : null);
  const err = str("error") ? `: ${str("error")}` : "";
  switch (action) {
    case "lead_created":
      return { text: `Lead submitted${str("state") ? ` from ${str("state")}` : ""}${str("source") ? ` via ${str("source")}` : ""}` };
    case "quoted": {
      const n = num("count") ?? 0;
      return { text: `Received ${n} quote${n === 1 ? "" : "s"}${str("rater") ? ` from ${str("rater")}` : ""}` };
    }
    case "lead_sold":
      return { text: `Sold${str("buyer") ? ` to ${str("buyer")}` : ""}${num("price") !== null ? ` for ${money(num("price")!)}` : ""}` };
    case "status_changed":
      return { text: `Status changed to ${STATUS_LABELS[str("status") ?? ""] ?? str("status") ?? "unknown"}` };
    case "lead_assigned":
      return { text: `Assigned to ${str("to") ?? "nobody"}` };
    case "task_added":
    case "task_done":
    case "task_reopened": {
      const verb = { task_added: "Task added", task_done: "Task completed", task_reopened: "Task reopened" }[action];
      return { text: `${verb}${str("title") ? `: ${str("title")}` : ""}` };
    }
    case "settings_updated":
      return { text: "Updated settings" };
    case "content_updated":
      return { text: `Updated website content${str("section") ? ` (${str("section")})` : ""}` };
    case "partner_created":
    case "partner_updated":
    case "partner_deleted":
    case "partner_paused":
    case "partner_activated":
      return { text: `${capital(action.split("_")[1])} partner ${str("name") ?? ""}`.trim() };
    case "buyer_created":
    case "buyer_updated":
    case "buyer_deleted":
    case "buyer_paused":
    case "buyer_activated":
      return { text: `${capital(action.split("_")[1])} lead buyer ${str("name") ?? ""}`.trim() };
    case "buyer_tested":
      return { text: `Sent a test lead to ${str("name") ?? "a buyer"}${str("result") ? ` (${str("result")})` : ""}` };
    case "user_created":
    case "user_role_changed":
    case "user_deactivated":
    case "user_reactivated":
    case "user_password_reset":
    case "user_2fa_reset": {
      const verb = {
        user_created: "Added user",
        user_role_changed: "Changed role of",
        user_deactivated: "Deactivated",
        user_reactivated: "Reactivated",
        user_password_reset: "Reset password for",
        user_2fa_reset: "Reset two-factor for",
      }[action];
      return { text: `${verb} ${str("email") ?? ""}${str("to") ? ` to ${str("to")}` : ""}`.trim() };
    }
    case "post_created":
    case "post_updated":
    case "post_published":
    case "post_submitted":
    case "post_unpublished":
    case "post_deleted": {
      const verb = { post_created: "Started blog post", post_updated: "Edited blog post", post_published: "Published blog post", post_submitted: "Sent for review:", post_unpublished: "Unpublished blog post", post_deleted: "Deleted blog post" }[action];
      return { text: `${verb} “${str("title") ?? "untitled"}”` };
    }
    case "page_created":
    case "page_updated":
    case "page_published":
    case "page_unpublished":
    case "page_deleted": {
      const verb = { page_created: "Created page", page_updated: "Edited page", page_published: "Published page", page_unpublished: "Unpublished page", page_deleted: "Deleted page" }[action];
      return { text: `${verb} “${str("title") ?? "untitled"}”` };
    }
    case "privacy_request": {
      const t = { opt_out_sale: "opt out of sale/sharing", opt_out_contact: "stop contact", access: "access their data", delete: "delete their data", correct: "correct their data" }[str("type") ?? ""] ?? "a privacy request";
      return { text: `Website visitor asked to ${t}${d.instant ? " (applied automatically)" : ""}` };
    }
    case "category_created":
    case "category_updated":
    case "category_deleted":
      return { text: `${capital(action.split("_")[1])} blog category ${str("name") ?? ""}`.trim() };
    case "rater_error":
      return { text: `Quoting failed${err}`, error: true };
    case "distribution_error":
      return { text: `Lead distribution failed${err}`, error: true };
    case "routing_failed":
      return { text: `Routing failed${err}`, error: true };
    case "notification_failed":
      return { text: `Alert failed${str("channel") ? ` (${str("channel")})` : ""}${err}`, error: true };
    default:
      return SIMPLE[action]
        ? { text: SIMPLE[action], error: ERROR_ACTIONS.includes(action) || action === "dnc_added" }
        : { text: action.replace(/_/g, " ") };
  }
}

/** Where to open the thing an audit entry is about, if anywhere. */
export function entityLink(entity: string, id: string) {
  if (entity === "lead" && id !== "*") return `/admin/leads/${id}`;
  if (entity === "partner") return `/admin/partners/${id}`;
  if (entity === "buyer") return `/admin/buyers?edit=${id}`;
  if (entity === "user") return "/admin/users";
  if (entity === "post" && id !== "*") return `/admin/blog/${id}`;
  if (entity === "category") return "/admin/blog/settings";
  if (entity === "page" && id !== "*") return `/admin/pages/${id}`;
  if (entity === "privacy_request") return "/admin/privacy#requests";
  if (entity === "media") return "/admin/blog/media";
  if (entity === "setting") {
    if (id === "navigation") return "/admin/menus";
    if (id === "content") return "/admin/content";
    if (id === "blog") return "/admin/blog/settings";
    if (id === "legal") return "/admin/legal";
    return id === "pricing" ? "/admin/pricing" : "/admin/settings";
  }
  return null;
}
