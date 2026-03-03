/**
 * Scraper de pages tarifaires des courtiers PEA.
 *
 * Récupère les pages publiques des courtiers et extrait les informations
 * tarifaires clés pour détecter les changements par rapport aux données
 * stockées dans pea-brokers.ts.
 *
 * Améliorations v2 :
 *   - URLs multiples par courtier (page PEA + page tarifaire)
 *   - Patterns spécifiques par courtier en plus des patterns génériques
 *   - Comparaison automatique avec les données stockées (drift detection)
 *   - Nettoyage HTML → texte brut avant extraction
 *
 * Utilisé par /api/brokers/check pour vérifier que les données sont à jour.
 */

import type { PeaBroker, FeeRange } from "@/data/pea-brokers";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScrapedBrokerData {
  brokerId: string;
  urls: string[];
  scrapedAt: string;
  /** Texte brut combiné de toutes les pages scrapées (HTML strippé). */
  combinedText: string;
  /** Extraits bruts trouvés dans les pages */
  findings: {
    fees: string[];
    promotions: string[];
    etfCount: string | null;
    actionCount: string | null;
    custody: string | null;
    inactivity: string | null;
    transferFee: string | null;
    /** Détection de gestion profilée / sous mandat */
    managedOption: {
      detected: boolean;
      feeMatch: string | null;
      profilesMatch: string[];
    } | null;
  };
  /** Données croisées depuis les sites de comparaison */
  comparisonFindings: {
    url: string;
    fees: string[];
    managedMentions: string[];
  }[];
  /** Comparaison avec les données stockées */
  drift: DriftItem[];
  /** Indicateurs de changement détecté */
  warnings: string[];
  error?: string;
}

export interface DriftItem {
  field: string;
  stored: string;
  scraped: string;
  severity: "info" | "warning" | "critical";
}

// ─────────────────────────────────────────────────────────────────────────────
// Headers HTTP
// ─────────────────────────────────────────────────────────────────────────────

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
};

// ─────────────────────────────────────────────────────────────────────────────
// Patterns génériques
// ─────────────────────────────────────────────────────────────────────────────

const FEE_PATTERNS = [
  /(\d+[.,]?\d*)\s*[€%]\s*(?:par\s+ordre|par\s+transaction|de\s+courtage|frais)/gi,
  /commission[s]?\s*(?:de\s+)?(\d+[.,]?\d*)\s*[€%]/gi,
  /(\d+[.,]?\d*)\s*[€%]\s*(?:fixe|flat)/gi,
  /gratuit|sans\s+frais|0\s*[€%]|zéro\s+frais/gi,
  /frais\s+de\s+garde[^.]*?(\d+[.,]?\d*\s*[€%]|gratuit)/gi,
  /inactivité[^.]*?(\d+[.,]?\d*\s*[€%]|aucun|gratuit)/gi,
  /courtage[^.]{0,60}(\d+[.,]?\d*\s*[€%])/gi,
  /ordre[^.]{0,40}(\d+[.,]?\d*\s*[€%])/gi,
];

const PROMO_PATTERNS = [
  /offre[^.]{5,80}(?:offert|remboursé|gratuit)/gi,
  /(?:jusqu'au|valable\s+jusqu')\s+\d{1,2}[/.\s]\d{1,2}[/.\s]\d{2,4}/gi,
  /code\s+(?:promo|promotionnel)?\s*[«"]?(\w+)[»"]?/gi,
  /frais\s+(?:offerts?|remboursés?)[^.]{5,80}/gi,
];

const CUSTODY_PATTERNS = [
  /(?:frais\s+de\s+)?(?:garde|tenue\s+de\s+compte|conservation)[^.]{0,60}(\d+[.,]?\d*\s*[€%]|gratuit)/gi,
  /droits?\s+de\s+garde[^.]{0,60}(\d+[.,]?\d*\s*[€%]|gratuit|aucun)/gi,
];

const INACTIVITY_PATTERNS = [
  /inactivité[^.]{0,60}(\d+[.,]?\d*\s*[€%]|gratuit|aucun)/gi,
  /sans\s+(?:activité|ordre)[^.]{0,40}(\d+[.,]?\d*\s*[€%])/gi,
];

const TRANSFER_PATTERNS = [
  /transfert[^.]{0,60}(\d+[.,]?\d*\s*[€%]|gratuit)/gi,
  /(?:frais\s+de\s+)?transfert\s+(?:sortant|entrant)[^.]{0,60}(\d+[.,]?\d*\s*€)/gi,
];

const COUNT_PATTERNS = {
  etf: /(\d[\d\s.,]*\d?)\s*ETF/gi,
  action: /(\d[\d\s.,]*\d?)\s*actions/gi,
};

// ─────────────────────────────────────────────────────────────────────────────
// Patterns gestion profilée / sous mandat
// ─────────────────────────────────────────────────────────────────────────────

const MANAGED_PATTERNS = [
  /gestion\s+profil[ée]e?/gi,
  /gestion\s+sous\s+mandat/gi,
  /gestion\s+conseill[ée]e?/gi,
  /gestion\s+d[ée]l[ée]gu[ée]e?/gi,
  /mandat\s+(?:de\s+)?gestion/gi,
];

const MANAGED_FEE_PATTERNS = [
  /gestion\s+profil[ée]e?[^.]{0,80}(\d+[.,]\d+)\s*%/gi,
  /mandat[^.]{0,60}(\d+[.,]\d+)\s*%\s*(?:\/?\s*an|all.in|tout\s+compris)/gi,
  /frais\s+de\s+gestion[^.]{0,40}(\d+[.,]\d+)\s*%/gi,
];

// ─────────────────────────────────────────────────────────────────────────────
// Patterns spécifiques par courtier
// ─────────────────────────────────────────────────────────────────────────────

const BROKER_SPECIFIC_PATTERNS: Record<string, RegExp[]> = {
  xtb: [
    /0\s*%\s*(?:de\s+)?commission/gi,
    /100\s*000\s*€/gi,
    /0[.,]20\s*%/gi,
  ],
  "trade-republic": [
    /1\s*€\s*(?:fixe|par\s+ordre)/gi,
    /plan[s]?\s+(?:d'investissement|programmé)/gi,
    /(?:0\s*€|gratuit)\s*(?:via|pour)\s*(?:plan|DCA)/gi,
  ],
  "interactive-brokers": [
    /0[.,]05\s*%/gi,
    /1[.,]25\s*€/gi,
    /(?:min(?:imum)?)\s*1[.,]25/gi,
    /(?:max(?:imum)?|plafonné)\s*29/gi,
  ],
  fortuneo: [
    /starter/gi,
    /optimum/gi,
    /0[.,]35\s*%/gi,
    /1[.,]95\s*€/gi,
    /1er\s+ordre[^.]*gratuit/gi,
    /amundi[^.]{0,60}remboursé/gi,
  ],
  boursobank: [
    /0[.,]50\s*%/gi,
    /plafond\s+légal/gi,
    /boursomarkets/gi,
    /200\s*€\s*minimum/gi,
    /160\s*(?:\+\s*)?ETF/gi,
    /iShares/gi,
  ],
  "bourse-direct": [
    /0[.,]99\s*€/gi,
    /1[.,]90\s*€/gi,
    /3[.,]80\s*€/gi,
    /ishares/gi,
    /amundi[^.]{0,60}remboursé/gi,
  ],
  "saxo-banque": [
    /0[.,]08\s*%/gi,
    /minimum\s*2\s*€/gi,
    /saxotraderpro/gi,
    /70\s+actions/gi,
    /0\s+frais[^.]{0,40}sélectionnées/gi,
  ],
  easybourse: [
    /3\s*€\s*(?:par\s+)?mois/gi,
    /0[.,]40\s*%/gi,
    /découverte/gi,
    /premium/gi,
    /banque\s+postale/gi,
  ],
  yomoni: [
    /1[.,]60\s*%/gi,
    /gestion\s+pilotée/gi,
    /1\s*000\s*€\s*minimum/gi,
    /tout\s+compris/gi,
  ],
  ramify: [
    /1[.,]20\s*%/gi,
    /1[.,]60\s*%/gi,
    /50\s*000\s*€/gi,
    /gestion\s+(?:conseillée|pilotée)/gi,
  ],
};

/** Patterns spécifiques pour la détection de gestion profilée par courtier. */
const BROKER_MANAGED_PATTERNS: Record<string, RegExp[]> = {
  boursobank: [
    /gestion\s+profil[ée]/gi,
    /amundi/gi,
    /prudent|[ée]quilibr[ée]|dynamique|offensif/gi,
    /1[.,]20\s*%\s*(?:\/?\s*an|tout\s+compris|all.in)/gi,
  ],
  fortuneo: [
    /gestion\s+sous\s+mandat/gi,
    /ark[ée]a/gi,
    /15\s*%\s*(?:de\s+)?(?:sur)?performance/gi,
    /30\s*000\s*€\s*(?:minimum|min)/gi,
  ],
  easybourse: [
    /gestion\s+sous\s+mandat/gi,
    /banque\s+postale/gi,
    /10\s*000\s*€/gi,
    /75\s*000\s*€/gi,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// URLs de sites de comparaison (pour croiser les données)
// ─────────────────────────────────────────────────────────────────────────────

const COMPARISON_URLS: Record<string, string[]> = {
  "trade-republic": [
    "https://avenuedesinvestisseurs.fr/avis-pea-trade-republic/",
    "https://finance-heros.fr/avis-courtier/avis-trade-republic/",
  ],
  xtb: [
    "https://avenuedesinvestisseurs.fr/avis-pea-xtb/",
  ],
  "interactive-brokers": [
    "https://finance-heros.fr/meilleur-pea/",
  ],
  fortuneo: [
    "https://avenuedesinvestisseurs.fr/avis-fortuneo-bourse-pea-cto/",
  ],
  boursobank: [
    "https://finance-heros.fr/avis-courtier/avis-boursorama-pea-compte-titre/",
    "https://avenuedesinvestisseurs.fr/pea-fortuneo-ou-boursobank/",
  ],
  "bourse-direct": [
    "https://avenuedesinvestisseurs.fr/avis-pea-bourse-direct/",
  ],
  "saxo-banque": [
    "https://investimieux.com/avis-pea-saxo/",
  ],
  easybourse: [
    "https://www.francetransactions.com/bourse/pea/pea-easybourse.html",
  ],
  yomoni: [
    "https://avenuedesinvestisseurs.fr/yomoni-avis-gestion-pilotee/",
  ],
  ramify: [
    "https://avenuedesinvestisseurs.fr/avis-ramify-gestion-pilotee/",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires d'extraction
// ─────────────────────────────────────────────────────────────────────────────

/** Supprime les tags HTML pour ne garder que le texte. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#?\w+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMatches(text: string, patterns: RegExp[]): string[] {
  const results: string[] = [];
  for (const pattern of patterns) {
    const copy = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = copy.exec(text)) !== null) {
      const extracted = match[0].trim().substring(0, 150);
      if (!results.includes(extracted)) results.push(extracted);
    }
  }
  return results;
}

function extractFirst(text: string, pattern: RegExp): string | null {
  const copy = new RegExp(pattern.source, pattern.flags);
  const match = copy.exec(text);
  return match?.[1]?.trim() ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drift detection — compare scraped data vs stored
// ─────────────────────────────────────────────────────────────────────────────

function feeRangeLabel(fr: FeeRange): string {
  if (fr.min === 0 && fr.max === 0) return "gratuit";
  if (fr.unit === "%") return `${fr.min}%`;
  return `${fr.min}€`;
}

function detectDrift(
  broker: PeaBroker,
  text: string,
): DriftItem[] {
  const drifts: DriftItem[] = [];

  // Vérifier la date de fraîcheur
  const lastChecked = new Date(broker.lastChecked);
  const daysSince = Math.floor(
    (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSince > 90) {
    drifts.push({
      field: "lastChecked",
      stored: broker.lastChecked,
      scraped: `${daysSince} jours depuis la dernière vérification`,
      severity: "critical",
    });
  } else if (daysSince > 30) {
    drifts.push({
      field: "lastChecked",
      stored: broker.lastChecked,
      scraped: `${daysSince} jours depuis la dernière vérification`,
      severity: "warning",
    });
  }

  // Vérifier les promotions expirées
  for (const promo of broker.promotions) {
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      drifts.push({
        field: "promotions",
        stored: promo.description,
        scraped: `Expirée depuis le ${promo.validUntil}`,
        severity: "warning",
      });
    }
  }

  // Détection par courtier — chercher les valeurs clés dans le texte
  const textLower = text.toLowerCase();

  // Frais d'ordre : vérifier que la valeur stockée apparaît dans le texte
  const storedFee = feeRangeLabel(broker.fees.orderEuronext);
  if (storedFee !== "gratuit") {
    // Extraire les pourcentages et montants mentionnés dans le texte
    const mentionedPcts = [...text.matchAll(/(\d+[.,]\d+)\s*%/g)].map(
      (m) => parseFloat(m[1].replace(",", ".")),
    );
    const mentionedEuros = [...text.matchAll(/(\d+[.,]?\d*)\s*€/g)].map(
      (m) => parseFloat(m[1].replace(",", ".")),
    );

    if (broker.fees.orderEuronext.unit === "%") {
      const storedPct = broker.fees.orderEuronext.min;
      if (mentionedPcts.length > 0 && !mentionedPcts.includes(storedPct)) {
        drifts.push({
          field: "fees.orderEuronext",
          stored: `${storedPct}%`,
          scraped: `Pourcentages trouvés : ${mentionedPcts.join(", ")}%`,
          severity: "warning",
        });
      }
    } else if (broker.fees.orderEuronext.unit === "EUR") {
      const storedMin = broker.fees.orderEuronext.min;
      if (
        storedMin > 0 &&
        mentionedEuros.length > 0 &&
        !mentionedEuros.includes(storedMin)
      ) {
        drifts.push({
          field: "fees.orderEuronext",
          stored: `${storedMin}€`,
          scraped: `Montants trouvés : ${mentionedEuros.slice(0, 10).join(", ")}€`,
          severity: "info",
        });
      }
    }
  }

  // Nombre d'ETFs : vérifier si le nombre a changé
  const etfMatch = text.match(/(\d[\d\s.,]*)\s*ETF/i);
  if (etfMatch && broker.features.etfCount) {
    const scrapedCount = parseInt(etfMatch[1].replace(/[\s.,]/g, ""), 10);
    if (
      !isNaN(scrapedCount) &&
      Math.abs(scrapedCount - broker.features.etfCount) / broker.features.etfCount > 0.2
    ) {
      drifts.push({
        field: "features.etfCount",
        stored: String(broker.features.etfCount),
        scraped: String(scrapedCount),
        severity: "info",
      });
    }
  }

  // Frais de garde
  if (
    broker.fees.custody.min === 0 &&
    broker.fees.custody.max === 0 &&
    /(?:droits?\s+de\s+garde|frais\s+de\s+garde)[^.]{0,30}\d+[.,]\d+\s*[€%]/i.test(
      textLower,
    )
  ) {
    drifts.push({
      field: "fees.custody",
      stored: "gratuit",
      scraped: "Mention de frais de garde détectée dans la page",
      severity: "warning",
    });
  }

  // Frais d'inactivité
  if (
    broker.fees.inactivity.min === 0 &&
    broker.fees.inactivity.max === 0 &&
    /inactivité[^.]{0,30}\d+[.,]?\d*\s*€/i.test(textLower)
  ) {
    drifts.push({
      field: "fees.inactivity",
      stored: "gratuit",
      scraped: "Mention de frais d'inactivité détectée dans la page",
      severity: "warning",
    });
  }

  // Gestion profilée : détection de mentions sans donnée stockée (ou inverse)
  const hasManagedMention = MANAGED_PATTERNS.some((p) =>
    new RegExp(p.source, p.flags).test(text),
  );
  if (hasManagedMention && !broker.managedOption) {
    drifts.push({
      field: "managedOption",
      stored: "null",
      scraped: "Mention de gestion profilée/sous mandat détectée",
      severity: "info",
    });
  }

  return drifts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scraping principal
// ─────────────────────────────────────────────────────────────────────────────

/** Récupère une URL et retourne le texte brut (HTML strippé). */
async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return stripHtml(html);
}

/** Collecte les URLs à scraper pour un courtier. */
function getBrokerUrls(broker: PeaBroker): string[] {
  const urls = [broker.peaUrl];
  if (broker.tariffUrl && broker.tariffUrl !== broker.peaUrl) {
    urls.push(broker.tariffUrl);
  }
  return urls;
}

/** Scrape toutes les pages d'un courtier et extrait les informations. */
export async function scrapeBrokerPage(
  broker: PeaBroker,
): Promise<ScrapedBrokerData> {
  const urls = getBrokerUrls(broker);
  const comparisonUrls = COMPARISON_URLS[broker.id] ?? [];

  const result: ScrapedBrokerData = {
    brokerId: broker.id,
    urls: [...urls, ...comparisonUrls],
    scrapedAt: new Date().toISOString(),
    combinedText: "",
    findings: {
      fees: [],
      promotions: [],
      etfCount: null,
      actionCount: null,
      custody: null,
      inactivity: null,
      transferFee: null,
      managedOption: null,
    },
    comparisonFindings: [],
    drift: [],
    warnings: [],
  };

  const allText: string[] = [];

  for (const url of urls) {
    try {
      const text = await fetchPageText(url);
      allText.push(text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      result.warnings.push(`[${url}] Scraping échoué : ${msg}`);
      if (urls.indexOf(url) === 0) {
        result.error = msg;
      }
    }
  }

  if (allText.length === 0) return result;

  const combinedText = allText.join(" ");
  result.combinedText = combinedText;

  // ── Extraction générique ────────────────────────────────────────────────
  result.findings.fees = extractMatches(combinedText, FEE_PATTERNS).slice(0, 15);
  result.findings.promotions = extractMatches(combinedText, PROMO_PATTERNS).slice(0, 8);
  result.findings.etfCount = extractFirst(combinedText, COUNT_PATTERNS.etf);
  result.findings.actionCount = extractFirst(combinedText, COUNT_PATTERNS.action);
  result.findings.custody =
    extractMatches(combinedText, CUSTODY_PATTERNS)[0] ?? null;
  result.findings.inactivity =
    extractMatches(combinedText, INACTIVITY_PATTERNS)[0] ?? null;
  result.findings.transferFee =
    extractMatches(combinedText, TRANSFER_PATTERNS)[0] ?? null;

  // ── Extraction spécifique au courtier ───────────────────────────────────
  const specificPatterns = BROKER_SPECIFIC_PATTERNS[broker.id];
  if (specificPatterns) {
    const specificFindings = extractMatches(combinedText, specificPatterns);
    // Ajouter les résultats spécifiques aux frais (déduplication)
    for (const finding of specificFindings) {
      if (!result.findings.fees.includes(finding)) {
        result.findings.fees.push(finding);
      }
    }
  }

  // ── Extraction gestion profilée ───────────────────────────────────────
  const managedMentions = extractMatches(combinedText, MANAGED_PATTERNS);
  const managedFees = extractMatches(combinedText, MANAGED_FEE_PATTERNS);
  const brokerManagedPatterns = BROKER_MANAGED_PATTERNS[broker.id];
  const brokerManagedMatches = brokerManagedPatterns
    ? extractMatches(combinedText, brokerManagedPatterns)
    : [];

  if (managedMentions.length > 0 || brokerManagedMatches.length > 0) {
    result.findings.managedOption = {
      detected: true,
      feeMatch: managedFees[0] ?? null,
      profilesMatch: brokerManagedMatches,
    };
  }

  // ── Scraping des sites de comparaison ─────────────────────────────────
  for (const compUrl of comparisonUrls) {
    try {
      const compText = await fetchPageText(compUrl);
      const compFees = extractMatches(compText, FEE_PATTERNS).slice(0, 10);
      const compManaged = extractMatches(compText, MANAGED_PATTERNS);
      result.comparisonFindings.push({
        url: compUrl,
        fees: compFees,
        managedMentions: compManaged,
      });
    } catch {
      result.warnings.push(`[comparaison] ${compUrl} — échec scraping`);
    }
    // Pause between comparison sites
    await new Promise((r) => setTimeout(r, 1000));
  }

  // ── Détection de drift ──────────────────────────────────────────────────
  result.drift = detectDrift(broker, combinedText);

  // Convertir les drifts critiques en warnings
  for (const d of result.drift) {
    if (d.severity === "critical" || d.severity === "warning") {
      result.warnings.push(`[${d.field}] ${d.stored} → ${d.scraped}`);
    }
  }

  return result;
}

/** Scrape toutes les pages tarifaires des courtiers. */
export async function scrapeAllBrokerPages(
  brokers: PeaBroker[],
): Promise<ScrapedBrokerData[]> {
  const results: ScrapedBrokerData[] = [];

  // Sequential pour éviter le rate limiting
  for (const broker of brokers) {
    const data = await scrapeBrokerPage(broker);
    results.push(data);
    // Pause entre chaque courtier (2 URLs possibles → la pause est entre courtiers)
    await new Promise((r) => setTimeout(r, 1500));
  }

  return results;
}
