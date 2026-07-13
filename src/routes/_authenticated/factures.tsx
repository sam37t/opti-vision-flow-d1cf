import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/factures")({
  component: FacturesLayout,
});

function FacturesLayout() {
  return <Outlet />;
}
