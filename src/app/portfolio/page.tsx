import { PortfolioClient } from "./portfolio-client";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon Portfolio</h1>
        <p className="text-muted-foreground">
          Allocation actuelle et projection jusqu&apos;a la retraite.
        </p>
      </div>
      <PortfolioClient />
    </div>
  );
}
