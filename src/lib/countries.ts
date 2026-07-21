// Country name → ISO 3166-1 alpha-2 mapping for flag rendering.
export const COUNTRY_TO_ISO2: Record<string, string> = {
  afghanistan: "af", albania: "al", algeria: "dz", andorra: "ad", angola: "ao",
  antiguaandbarbuda: "ag", "antigua and barbuda": "ag", argentina: "ar", armenia: "am",
  australia: "au", austria: "at", azerbaijan: "az",
  bahamas: "bs", bahrain: "bh", bangladesh: "bd", barbados: "bb", belarus: "by",
  belgium: "be", belize: "bz", benin: "bj", bhutan: "bt", bolivia: "bo",
  bosniaandherzegovina: "ba", "bosnia and herzegovina": "ba", botswana: "bw", brazil: "br",
  brunei: "bn", bulgaria: "bg", burkinafaso: "bf", "burkina faso": "bf", burundi: "bi",
  cambodia: "kh", cameroon: "cm", canada: "ca", capeverde: "cv", "cape verde": "cv",
  centralafricanrepublic: "cf", "central african republic": "cf", chad: "td", chile: "cl",
  china: "cn", colombia: "co", comoros: "km", congo: "cg", "republic of the congo": "cg",
  costarica: "cr", "costa rica": "cr", croatia: "hr", cuba: "cu", cyprus: "cy",
  czechia: "cz", "czech republic": "cz",
  denmark: "dk", djibouti: "dj", dominica: "dm", dominicanrepublic: "do", "dominican republic": "do",
  ecuador: "ec", egypt: "eg", elsalvador: "sv", "el salvador": "sv",
  equatorialguinea: "gq", "equatorial guinea": "gq", eritrea: "er", estonia: "ee",
  eswatini: "sz", swaziland: "sz", ethiopia: "et",
  fiji: "fj", finland: "fi", france: "fr",
  gabon: "ga", gambia: "gm", georgia: "ge", germany: "de", ghana: "gh", greece: "gr",
  grenada: "gd", guatemala: "gt", guinea: "gn", guineabissau: "gw", "guinea-bissau": "gw", guyana: "gy",
  haiti: "ht", honduras: "hn", hungary: "hu",
  iceland: "is", india: "in", indonesia: "id", iran: "ir", iraq: "iq", ireland: "ie",
  israel: "il", italy: "it",
  jamaica: "jm", japan: "jp", jordan: "jo",
  kazakhstan: "kz", kenya: "ke", kiribati: "ki", kuwait: "kw", kyrgyzstan: "kg",
  laos: "la", latvia: "lv", lebanon: "lb", lesotho: "ls", liberia: "lr", libya: "ly",
  liechtenstein: "li", lithuania: "lt", luxembourg: "lu",
  madagascar: "mg", malawi: "mw", malaysia: "my", maldives: "mv", mali: "ml", malta: "mt",
  marshallislands: "mh", "marshall islands": "mh", mauritania: "mr", mauritius: "mu",
  mexico: "mx", micronesia: "fm", moldova: "md", monaco: "mc", mongolia: "mn",
  montenegro: "me", morocco: "ma", mozambique: "mz", myanmar: "mm",
  namibia: "na", nauru: "nr", nepal: "np", netherlands: "nl", newzealand: "nz",
  "new zealand": "nz", nicaragua: "ni", niger: "ne", nigeria: "ng",
  northkorea: "kp", "north korea": "kp", northmacedonia: "mk", "north macedonia": "mk", norway: "no",
  oman: "om",
  pakistan: "pk", palau: "pw", palestine: "ps", panama: "pa",
  papuanewguinea: "pg", "papua new guinea": "pg", paraguay: "py", peru: "pe",
  philippines: "ph", poland: "pl", portugal: "pt",
  qatar: "qa",
  romania: "ro", russia: "ru", rwanda: "rw",
  saintkittsandnevis: "kn", "saint kitts and nevis": "kn",
  saintlucia: "lc", "saint lucia": "lc",
  saintvincentandthegrenadines: "vc", "saint vincent and the grenadines": "vc",
  samoa: "ws", sanmarino: "sm", "san marino": "sm",
  saotomeandprincipe: "st", "sao tome and principe": "st",
  saudiarabia: "sa", "saudi arabia": "sa", senegal: "sn", serbia: "rs", seychelles: "sc",
  sierraleone: "sl", "sierra leone": "sl", singapore: "sg", slovakia: "sk", slovenia: "si",
  solomonislands: "sb", "solomon islands": "sb", somalia: "so",
  southafrica: "za", "south africa": "za", southkorea: "kr", "south korea": "kr",
  southsudan: "ss", "south sudan": "ss", spain: "es", srilanka: "lk", "sri lanka": "lk",
  sudan: "sd", suriname: "sr", sweden: "se", switzerland: "ch", syria: "sy",
  taiwan: "tw", tajikistan: "tj", tanzania: "tz", thailand: "th", timorleste: "tl",
  "timor-leste": "tl", togo: "tg", tonga: "to", trinidadandtobago: "tt",
  "trinidad and tobago": "tt", tunisia: "tn", turkey: "tr", turkmenistan: "tm", tuvalu: "tv",
  uganda: "ug", ukraine: "ua", unitedarabemirates: "ae", "united arab emirates": "ae",
  unitedkingdom: "gb", "united kingdom": "gb", uk: "gb",
  unitedstates: "us", "united states": "us", usa: "us", uruguay: "uy", uzbekistan: "uz",
  vanuatu: "vu", vaticancity: "va", "vatican city": "va", venezuela: "ve", vietnam: "vn",
  yemen: "ye", zambia: "zm", zimbabwe: "zw",
};

export const getCountryIso2 = (country: string | null | undefined): string | null => {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "global" || normalized === "international") return null;
  if (/^[a-z]{2}$/.test(normalized)) return normalized;
  const simplified = normalized.replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  const collapsed = simplified.replace(/\s+/g, "");
  return COUNTRY_TO_ISO2[simplified] ?? COUNTRY_TO_ISO2[collapsed] ?? null;
};

export const getDisplayCountry = (country: string | null | undefined): string => {
  if (!country) return "";
  const normalized = country.trim();
  if (!normalized) return "";
  const slashParts = normalized.split("/").map((p) => p.trim()).filter(Boolean);
  const candidate = slashParts.length > 1 ? slashParts[slashParts.length - 1] : normalized;
  return candidate.trim();
};

/**
 * Resolves a tender's display name + flag code. Prefers the backend-provided
 * country_iso2 (joined against country_reference for the canonical name,
 * e.g. "Cote d'Ivoire" instead of "COTE D'IVOIRE"); falls back to guessing
 * from the raw `country` string when country_iso2 is null (unmapped spelling).
 */
export const resolveCountryDisplay = (
  country: string | null | undefined,
  countryIso2: string | null | undefined,
  byIso2?: Map<string, { canonical_name: string }>
): { name: string; iso2: string | null } => {
  if (countryIso2) {
    const ref = byIso2?.get(countryIso2.toUpperCase());
    return {
      name: ref?.canonical_name ?? (getDisplayCountry(country) || countryIso2),
      iso2: countryIso2.toLowerCase(),
    };
  }
  return { name: getDisplayCountry(country), iso2: getCountryIso2(country) };
};
