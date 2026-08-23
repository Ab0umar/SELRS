const DATA_URL =
  "https://raw.githubusercontent.com/karem505/egyptian-drug-database/main/data/egyptian-drugs.json";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type EgyptianDrugReference = {
  commercialNameEn: string;
  commercialNameAr: string;
  scientificName: string;
  manufacturer: string;
  drugClass: string;
  route: string;
  dosageForm: EgyptianDrugDosageForm;
  strength: string;
  priceEgp: number | null;
};

export const egyptianDrugDosageForms = [
  "drops",
  "ointment",
  "tablets",
  "capsules",
  "ampoules",
  "solution",
  "suspension",
  "syrup",
  "cream",
  "gel",
  "spray",
  "suppository",
  "powder",
  "inhaler",
  "other",
] as const;

export type EgyptianDrugDosageForm = (typeof egyptianDrugDosageForms)[number];

let cachedRows: EgyptianDrugReference[] | null = null;
let cachedAt = 0;
let loadingPromise: Promise<EgyptianDrugReference[]> | null = null;

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("ar-EG")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function canonicalDrugName(value: unknown) {
  return normalize(value)
    .replace(/[._,;:'"`+\-]+/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu|miu|meq)(?:\s*\/\s*(?:ml|dose|actuation|g))?|\b\d+(?:\.\d+)?\s*%/g,
      " ",
    )
    .replace(
      /\b(?:e\s*d|eye\s*drops?|eye|ear|nasal|oral|f\s*c|drops?|tabs?|tablets?|caps?|capsules?|amps?|ampoules?|vials?|ointment|oint|cream|gel|suspension|susp|syrup|syr|solution|soln|spray|sachets?|topical)\b/g,
      " ",
    )
    .replace(/\b\d+\s*(?:ml|gm|g|pieces?|pcs?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function nameSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.length >= 5 && right.length >= 5) {
    if (left.includes(right) || right.includes(left)) {
      return (
        Math.min(left.length, right.length) /
        Math.max(left.length, right.length)
      );
    }
  }
  return 1 - editDistance(left, right) / Math.max(left.length, right.length);
}

function inferDosageForm(name: string, route: string): EgyptianDrugDosageForm {
  const value = ` ${name.toUpperCase()} `;
  const normalizedRoute = route.toUpperCase();
  const has = (pattern: RegExp) => pattern.test(value);

  if (has(/\b(EYE|EAR|NASAL)?\s*DROPS?\b|\bE\.D\.?\b|\bEYE D\.\b/))
    return "drops";
  if (has(/\bOINT(?:MENT)?\.?\b|\bEYE OINT\b/)) return "ointment";
  if (has(/\bCAPS?(?:ULES?)?\.?\b|\bSOFTGELS?\b/)) return "capsules";
  if (has(/\bTABS?(?:LETS?)?\.?\b|\bF\.?C\.?T\.?\b|\bCHEWABLE\b/))
    return "tablets";
  if (has(/\bAMPS?(?:OULES?)?\.?\b/)) return "ampoules";
  if (has(/\bSUSP(?:ENSION)?\.?\b/)) return "suspension";
  if (has(/\bSYR(?:UP)?\.?\b/)) return "syrup";
  if (has(/\bCREAM\b|\bCR\.?\b/)) return "cream";
  if (has(/\bGEL\b/)) return "gel";
  if (has(/\bSPRAY\b/)) return "spray";
  if (has(/\bSUPP(?:OSITOR(?:Y|IES))?\.?\b/)) return "suppository";
  if (has(/\bPOWDER\b|\bSACHETS?\b|\bGRANULES?\b/)) return "powder";
  if (has(/\bINHALER\b|\bTURBUHALER\b|\bACCUHALER\b/)) return "inhaler";
  if (
    has(/\bSOLN?\.?\b|\bSOLUTION\b|\bINFUSION\b/) ||
    normalizedRoute === "ORAL.LIQUID"
  ) {
    return "solution";
  }
  if (normalizedRoute === "ORAL.SOLID") return "tablets";
  if (normalizedRoute === "INJECTION") return "ampoules";
  return "other";
}

function inferStrength(name: string) {
  const normalized = name
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\bM\.G\.?\b/g, "MG")
    .replace(/\bMCG\.?(?=\s|\/|$)/g, "MCG")
    .replace(/\bI\.U\.?\b/g, "IU");
  const matches = normalized.match(
    /\b\d+(?:\.\d+)?\s*(?:MG|MCG|G|IU|MIU|MEQ)(?:\s*\/\s*(?:ML|DOSE|ACTUATION|G))?|\b\d+(?:\.\d+)?\s*%/g,
  );
  if (!matches) return "";
  return [...new Set(matches.map((value) => value.replace(/\s+/g, " ").trim()))]
    .slice(0, 4)
    .join(" + ");
}

async function loadRows() {
  if (cachedRows && Date.now() - cachedAt < CACHE_TTL_MS) return cachedRows;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const response = await fetch(DATA_URL, {
      headers: { Accept: "application/json", "User-Agent": "SELRS/1.0" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`Drug reference download failed (${response.status})`);
    }
    const payload = (await response.json()) as Array<Record<string, unknown>>;
    cachedRows = payload.map((row) => {
      const commercialNameEn = String(row.commercial_name_en ?? "").trim();
      const route = String(row.route ?? "").trim();
      return {
        commercialNameEn,
        commercialNameAr: String(row.commercial_name_ar ?? "").trim(),
        scientificName: String(row.scientific_name ?? "").trim(),
        manufacturer: String(row.manufacturer ?? "").trim(),
        drugClass: String(row.drug_class ?? "").trim(),
        route,
        dosageForm: inferDosageForm(commercialNameEn, route),
        strength: inferStrength(commercialNameEn),
        priceEgp:
          typeof row.price_egp === "number" && Number.isFinite(row.price_egp)
            ? row.price_egp
            : null,
      };
    });
    cachedAt = Date.now();
    return cachedRows;
  })().finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

export async function searchEgyptianDrugReference(
  query: string,
  limit = 30,
  dosageForm?: EgyptianDrugDosageForm,
) {
  const term = normalize(query);
  if (term.length < 2 && !dosageForm) {
    return { items: [], total: 0, updated: "June 2026" };
  }

  const rows = await loadRows();
  const matches = rows.filter((row) => {
    if (dosageForm && row.dosageForm !== dosageForm) return false;
    if (!term) return true;
    return [
      row.commercialNameEn,
      row.commercialNameAr,
      row.scientificName,
      row.manufacturer,
      row.drugClass,
    ].some((value) => normalize(value).includes(term));
  });

  const effectiveLimit = dosageForm && !term ? matches.length : limit;

  return {
    items: matches.slice(0, Math.max(effectiveLimit, 1)),
    total: matches.length,
    updated: "June 2026",
  };
}

export async function matchEgyptianDrugReference(
  names: string[],
  allowedForms?: EgyptianDrugDosageForm[],
) {
  const rows = await loadRows();
  const exact = new Map<string, EgyptianDrugReference[]>();
  const canonical = new Map<string, EgyptianDrugReference[]>();
  const ingredients = new Map<string, EgyptianDrugReference[]>();

  for (const row of rows) {
    for (const displayName of [row.commercialNameEn, row.commercialNameAr]) {
      const exactKey = normalize(displayName);
      const canonicalKey = canonicalDrugName(displayName);
      if (exactKey) {
        exact.set(exactKey, [...(exact.get(exactKey) ?? []), row]);
      }
      if (canonicalKey) {
        canonical.set(canonicalKey, [
          ...(canonical.get(canonicalKey) ?? []),
          row,
        ]);
      }
    }
    const ingredientKey = canonicalDrugName(row.scientificName);
    if (ingredientKey) {
      ingredients.set(ingredientKey, [
        ...(ingredients.get(ingredientKey) ?? []),
        row,
      ]);
    }
  }

  return names.map((name) => {
    const requestedForm = inferDosageForm(name, "");
    const formMatches = (row: EgyptianDrugReference) =>
      (allowedForms?.length ? allowedForms.includes(row.dosageForm) : true) &&
      (requestedForm === "other" || row.dosageForm === requestedForm);
    const exactMatches = exact.get(normalize(name)) ?? [];
    const exactFormMatches = exactMatches.filter(formMatches);
    if (exactFormMatches.length === 1) {
      return { name, match: exactFormMatches[0], confidence: "exact" as const };
    }
    const canonicalMatches = (
      canonical.get(canonicalDrugName(name)) ?? []
    ).filter(formMatches);
    if (canonicalMatches.length === 1) {
      return {
        name,
        match: canonicalMatches[0],
        confidence: "normalized" as const,
      };
    }

    const inputKey = canonicalDrugName(name);
    const allIngredientMatches = ingredients.get(inputKey) ?? [];
    const ingredientMatches =
      requestedForm === "other"
        ? allIngredientMatches.filter((row) => row.dosageForm === "drops")
            .length
          ? allIngredientMatches.filter((row) => row.dosageForm === "drops")
          : allIngredientMatches.filter((row) => row.dosageForm === "ointment")
        : allIngredientMatches.filter(formMatches);
    if (ingredientMatches.length > 0) {
      return {
        name,
        match: ingredientMatches[0],
        confidence: "ingredient" as const,
      };
    }

    if (inputKey.length >= 5) {
      const ocularRows = rows.filter(
        (row) =>
          (row.dosageForm === "drops" || row.dosageForm === "ointment") &&
          formMatches(row),
      );
      const candidateRows =
        requestedForm === "other" ? ocularRows : rows.filter(formMatches);
      const ranked = candidateRows
        .map((row) => ({
          row,
          score: Math.max(
            nameSimilarity(inputKey, canonicalDrugName(row.commercialNameEn)),
            nameSimilarity(inputKey, canonicalDrugName(row.commercialNameAr)),
            nameSimilarity(inputKey, canonicalDrugName(row.scientificName)),
          ),
        }))
        .filter((candidate) => candidate.score >= 0.74)
        .sort((left, right) => right.score - left.score);
      const best = ranked[0];
      const runnerUp = ranked[1];
      if (
        best &&
        (!runnerUp || best.score - runnerUp.score >= 0.04 || best.score >= 0.9)
      ) {
        return {
          name,
          match: best.row,
          confidence: "suggested" as const,
        };
      }

      const suspected = candidateRows
        .map((row) => ({
          row,
          score: Math.max(
            nameSimilarity(inputKey, canonicalDrugName(row.commercialNameEn)),
            nameSimilarity(inputKey, canonicalDrugName(row.commercialNameAr)),
            nameSimilarity(inputKey, canonicalDrugName(row.scientificName)),
          ),
        }))
        .filter((candidate) => candidate.score >= 0.42)
        .sort((left, right) => right.score - left.score)[0];
      if (suspected) {
        return {
          name,
          match: suspected.row,
          confidence: "suspected" as const,
        };
      }
    }
    return { name, match: null, confidence: "none" as const };
  });
}
