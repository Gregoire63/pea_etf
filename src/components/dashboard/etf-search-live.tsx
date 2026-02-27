"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ExternalLink, X } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
  isParis: boolean;
}

// Map des ISIN connus par ticker .PA (pour liens internes)
const KNOWN_ISINS: Record<string, string> = {
  "WPEA.PA": "IE0002XZSHO1",
  "CW8.PA": "LU1681043599",
  "DCAM.PA": "FR001400U5Q4",
  "LCWD.PA": "LU1781541179",
  "PSP5.PA": "FR0011871128",
  "ESE.PA": "FR0011550185",
  "PUST.PA": "FR0011871110",
  "RS2K.PA": "LU1681038672",
  "PANX.PA": "FR0013412269",
  "ETZ.PA": "FR0011550193",
  "MSEU.PA": "LU1681042609",
  "CEU.PA": "LU1681040223",
  "MEUD.PA": "FR0007054358",
  "CACC.PA": "FR0013380607",
  "C50.PA": "LU1681047236",
  "PAEEM.PA": "FR0013412020",
  "CEMU.PA": "LU1681044480",
  "PAASI.PA": "FR0013412012",
  "CP9.PA": "LU1681043086",
  "PINR.PA": "FR0011869320",
  "PKRW.PA": "FR0011869312",
  "TPXE.PA": "FR0011411980",
  "TNOW.PA": "LU1834987890",
  "HLT.PA": "LU1834986900",
  "CD8.PA": "LU1834988351",
  "CU2.PA": "LU1834988088",
  "C6E.PA": "LU1834988161",
  "C8R.PA": "LU1834988245",
  "PNRJ.PA": "FR0011869379",
  "GOAI.PA": "LU2572257124",
  "CL2.PA": "FR0010755611",
  "LQQ.PA": "FR0010342592",
  "CE8.PA": "LU1681044050",
  "MUSA.PA": "LU1681038326",
  "MID.PA": "LU2089238385",
  "WATL.PA": "LU2089238302",
  "AGRI.PA": "LU2089237494",
  "PLEM.PA": "FR0011869296",
};

function useDebounce(value: string, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function EtfSearchLive({ knownIsins }: { knownIsins?: Record<string, string> }) {
  const isinMap = knownIsins ?? KNOWN_ISINS;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const internalIsin = results.find((r) => isinMap[r.symbol])
    ? isinMap[results.find((r) => isinMap[r.symbol])!.symbol]
    : null;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un ETF (nom, ticker, ISIN…)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-md border bg-background py-2 pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (query.length >= 2) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-background shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Recherche…</div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Aucun ETF trouvé.</div>
          )}
          {results.map((r) => {
            const isin = isinMap[r.symbol];
            return (
              <div key={r.symbol} className="group">
                {isin ? (
                  <Link
                    href={`/etf/${isin}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/50"
                  >
                    <ResultRow result={r} />
                  </Link>
                ) : (
                  <a
                    href={`https://finance.yahoo.com/quote/${r.symbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted/50"
                  >
                    <ResultRow result={r} />
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                )}
              </div>
            );
          })}
          <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
            Données : Yahoo Finance · Les ETF <span className="font-medium text-primary">.PA</span> sont potentiellement éligibles PEA
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="shrink-0 font-mono text-sm font-medium">{result.symbol}</span>
      {result.isParis && (
        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          .PA
        </span>
      )}
      <span className="truncate text-xs text-muted-foreground">{result.shortname}</span>
    </div>
  );
}
