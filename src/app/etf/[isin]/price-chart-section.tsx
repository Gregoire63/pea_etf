import { getHistoricalPricesForIsin } from "@/lib/etf-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EtfDetailChart } from "./chart";

export async function PriceChartSection({
  isin,
  ticker,
}: {
  isin: string;
  ticker: string;
}) {
  const prices = await getHistoricalPricesForIsin(isin, 10);
  if (prices.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique de prix</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <EtfDetailChart prices={prices} ticker={ticker} />
      </CardContent>
    </Card>
  );
}
