// Shared by the admin panel and the login page. The panel's shell and sign-in check
// live in (panel)/layout.tsx so the login page stays reachable.
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
