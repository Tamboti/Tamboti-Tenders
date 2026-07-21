import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CountryReferenceRow = {
  iso2: string;
  canonical_name: string;
  continent: string;
  subregion: string | null;
};

/**
 * country_reference is the single source of truth for country display names
 * and continent/subregion scoping — never hardcode a country list, derive it
 * from this table. It's small (~150 rows) and effectively static, so it's
 * fetched once and cached for the session.
 */
export const useCountryReference = () => {
  const query = useQuery({
    queryKey: ["country-reference"],
    queryFn: async (): Promise<CountryReferenceRow[]> => {
      const { data, error } = await supabase
        .from("country_reference")
        .select("iso2, canonical_name, continent, subregion");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Multiple name_variant rows share one iso2 (e.g. CAPE VERDE / CABO VERDE
  // both -> CV) — collapse to one entry per iso2.
  const byIso2 = useMemo(() => {
    const map = new Map<string, CountryReferenceRow>();
    for (const row of query.data ?? []) {
      if (!map.has(row.iso2)) map.set(row.iso2, row);
    }
    return map;
  }, [query.data]);

  const africaSubregions = useMemo(() => {
    const set = new Set<string>();
    for (const row of byIso2.values()) {
      if (row.continent === "Africa" && row.subregion) set.add(row.subregion);
    }
    return Array.from(set).sort();
  }, [byIso2]);

  return { byIso2, africaSubregions, isLoading: query.isLoading };
};
