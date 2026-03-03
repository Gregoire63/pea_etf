/**
 * Mapping structuré : émetteur ETF → offres partenaires courtiers.
 *
 * Ce fichier centralise les partenariats courtiers/émetteurs pour un affichage
 * programmatique (badges, section détail). Il complète le champ freetext
 * `etfPartnerships` de pea-brokers.ts.
 *
 * Ajouter un partenariat = ajouter une entrée dans ISSUER_PARTNERSHIPS.
 * Les deals expirés (validUntil < today) sont automatiquement filtrés.
 */

import type { BrokerDealInfo } from "@/types/etf";

// ─────────────────────────────────────────────────────────────────────────────
// Données partenariats
// ─────────────────────────────────────────────────────────────────────────────

interface IssuerDeals {
  issuer: string;
  deals: BrokerDealInfo[];
}

const ISSUER_PARTNERSHIPS: IssuerDeals[] = [
  {
    issuer: "iShares",
    deals: [
      {
        brokerId: "boursobank",
        brokerName: "BoursoBank",
        badgeLabel: "0 € frais",
        description: "BoursoMarkets : 160+ ETF iShares (BlackRock) à 0 € de frais à l'achat et à la vente",
        dealType: "free",
        conditions: "Ordre minimum 200 €",
        validUntil: null,
      },
      {
        brokerId: "bourse-direct",
        brokerName: "Bourse Direct",
        badgeLabel: "Max 0,99 €",
        description: "ETF iShares : frais plafonnés à 0,99 € par ordre d'achat",
        dealType: "capped",
        conditions: "Sur la sélection ETF iShares éligibles PEA",
        validUntil: "2026-09-15",
      },
    ],
  },
  {
    issuer: "Amundi",
    deals: [
      {
        brokerId: "fortuneo",
        brokerName: "Fortuneo",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d'achat ETF Amundi remboursé chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 800 € et 100 000 €",
        validUntil: "2026-03-31",
      },
      {
        brokerId: "bourse-direct",
        brokerName: "Bourse Direct",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d'achat ETF Amundi remboursé chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 200 € et 100 000 €",
        validUntil: "2026-04-30",
      },
    ],
  },
  {
    // Lyxor est désormais Amundi, mais certains ETF portent encore le nom Lyxor
    issuer: "Lyxor",
    deals: [
      {
        brokerId: "fortuneo",
        brokerName: "Fortuneo",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d'achat ETF Amundi/Lyxor remboursé chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 800 € et 100 000 €",
        validUntil: "2026-03-31",
      },
      {
        brokerId: "bourse-direct",
        brokerName: "Bourse Direct",
        badgeLabel: "1er ordre offert",
        description: "1er ordre d'achat ETF Amundi/Lyxor remboursé chaque mois",
        dealType: "reimbursed",
        conditions: "Ordre entre 200 € et 100 000 €",
        validUntil: "2026-04-30",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Retourne les deals actifs (non expirés) pour un émetteur donné. */
export function getActiveDealsForIssuer(issuer: string): BrokerDealInfo[] {
  const today = new Date().toISOString().slice(0, 10);
  const entry = ISSUER_PARTNERSHIPS.find(
    (p) => p.issuer.toLowerCase() === issuer.toLowerCase(),
  );
  if (!entry) return [];
  return entry.deals.filter(
    (d) => d.validUntil === null || d.validUntil >= today,
  );
}
