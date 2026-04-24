import { PlaceholderPage } from "@/components/placeholder-page";

export default function BranchesPage() {
  return (
    <PlaceholderPage
      title="Branches"
      icon="🏢"
      description="GET /api/v1/branches is not available on the backend yet. When it ships, this page will list branches and related actions."
      bullets={["Placeholder per hub API plan", "No hub calls to /branches until the route exists"]}
    />
  );
}
