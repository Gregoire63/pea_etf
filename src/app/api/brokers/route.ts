/**
 * GET /api/brokers
 *
 * Retourne la liste des courtiers PEA avec leurs données comparatives.
 * Filtrable par type et triable par coût d'un ordre.
 *
 * Les promotions expirées sont automatiquement retirées.
 * Le drift scraper tourne en background (cache 24h) pour détecter les changements.
 */

import { NextResponse } from "next/server";
import { getBrokers } from "@/lib/brokers";
import { sortByOrderCost } from "@/data/pea-brokers";
import type { BrokerType } from "@/data/pea-brokers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as BrokerType | null;
  const orderAmount = searchParams.get("orderAmount");

  let brokers = await getBrokers();

  if (type) {
    brokers = brokers.filter((b) => b.type === type);
  }

  if (orderAmount) {
    const amount = Number(orderAmount);
    if (!isNaN(amount) && amount > 0) {
      const sorted = sortByOrderCost(amount);
      const sortedIds = sorted.map((b) => b.id);
      brokers = [...brokers].sort(
        (a, b) => sortedIds.indexOf(a.id) - sortedIds.indexOf(b.id),
      );
      if (type) {
        brokers = brokers.filter((b) => b.type === type);
      }
    }
  }

  const overridesApplied = brokers.filter(
    (b) => b.freshness.overrides.length > 0,
  ).length;

  return NextResponse.json({
    brokers,
    totalCount: brokers.length,
    overridesApplied,
    lastUpdated: brokers.reduce(
      (latest, b) => (b.lastChecked > latest ? b.lastChecked : latest),
      "",
    ),
  });
}
