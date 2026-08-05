// On-demand translation of a single tender into a user-facing language.
//
// English is the pivot: we translate FROM the normalised English text
// (tenders.title_en / summary_en / description_en, falling back to title when
// the source was already English) INTO the requested language. Results are
// cached in public.tender_translations, so a second request for the same
// tender+lang costs nothing. description_en is optional — not every tender
// has one yet — so it's only translated (and only required back) when present.
//
// POST body: { "tender_id": "uuid", "lang": "cs" }   // lang defaults to "cs"
// Response:  { success, lang, title, summary, description, cached }
//
// Auth: a valid user JWT (any authenticated user may translate), OR the
// x-cron-secret header for server-side batch/backfill use.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const SUPPORTED_LANGS: Record<string, string> = {
  cs: "Czech",
  en: "English",
  fr: "French",
  pt: "Portuguese",
  es: "Spanish",
  sw: "Swahili",
  de: "German",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
};

const stripFences = (t: string) =>
  t.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

const SYSTEM_PROMPT = (langName: string, includeDescription: boolean) =>
  `You are a procurement translator. Translate the given tender ` +
  `${includeDescription ? "title, summary and description" : "title and summary"} ` +
  `from English into ${langName}. Respond with a JSON object only (no markdown, ` +
  `no code fences) with exactly ${includeDescription
    ? `three keys: "title", "summary" and "description"`
    : `two keys: "title" and "summary"`}. Keep technical ` +
  `procurement terms, reference numbers, place names and figures accurate. ` +
  `Write natural, professional ${langName}.`;

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
    `?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        // 800 was too low for title+summary alone; now that a full
        // description can be part of the payload too, this needs more
        // headroom still, or Gemini returns a truncated candidate with no
        // parts, which then fails to parse.
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  const cand = data?.candidates?.[0];
  const text = cand?.content?.parts?.map((p: any) => p?.text ?? "").join("").trim() ?? "";
  if (!text) {
    throw new Error(
      `Gemini empty response (finishReason=${cand?.finishReason ?? "none"}, ` +
      `promptFeedback=${JSON.stringify(data?.promptFeedback ?? null)})`,
    );
  }
  return text;
}

async function callLovable(prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Lovable ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = (await res.json())?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Lovable returned an empty response");
  return text;
}

async function translate(
  title: string,
  summary: string,
  description: string | null,
  langCode: string,
): Promise<{ title: string; summary: string; description: string | null }> {
  if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
    throw new Error("No AI provider configured (GEMINI_API_KEY / LOVABLE_API_KEY)");
  }

  const includeDescription = !!description;
  const systemPrompt = SYSTEM_PROMPT(SUPPORTED_LANGS[langCode], includeDescription);
  const prompt = includeDescription
    ? `Title: ${title}\nSummary: ${summary}\nDescription: ${description}`
    : `Title: ${title}\nSummary: ${summary}`;

  let raw = "";
  if (GEMINI_API_KEY) {
    try {
      raw = await callGemini(prompt, systemPrompt);
    } catch (e) {
      log.warn("Gemini translate failed, trying fallback", { error: (e as Error).message });
      if (!LOVABLE_API_KEY) throw e;
      raw = await callLovable(prompt, systemPrompt);
    }
  } else {
    raw = await callLovable(prompt, systemPrompt);
  }

  const cleaned = stripFences(raw);
  let parsed: { title?: string; summary?: string; description?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Non-JSON translation response: ${cleaned.slice(0, 180)}`);
  }

  const outTitle = parsed?.title?.trim();
  const outSummary = parsed?.summary?.trim();
  const outDescription = includeDescription ? parsed?.description?.trim() : undefined;
  if (!outTitle || !outSummary || (includeDescription && !outDescription)) {
    throw new Error(
      `Translation missing ${includeDescription ? "title/summary/description" : "title/summary"}, ` +
      `keys: ${Object.keys(parsed ?? {}).join(",")}`,
    );
  }
  return { title: outTitle, summary: outSummary, description: outDescription ?? null };
}

Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── auth: cron secret (server-side) OR any signed-in user ──
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  if (cronSecret) {
    const { data: secretRow } = await supabase
      .from("app_secrets").select("value").eq("name", "cron_secret").maybeSingle();
    if (!secretRow?.value || cronSecret !== secretRow.value) {
      return json(401, { error: "Invalid cron secret" });
    }
  } else {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json(401, { error: "Unauthorized" });
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: userData, error: userErr } = await anon.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  }

  let tender_id: string | undefined;
  let lang = "cs";
  try {
    const body = await req.json();
    tender_id = body?.tender_id;
    if (typeof body?.lang === "string") lang = body.lang.toLowerCase().slice(0, 2);
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!tender_id) return json(400, { error: "tender_id is required" });
  if (!(lang in SUPPORTED_LANGS)) {
    return json(400, {
      error: `Unsupported language "${lang}"`,
      supported: Object.keys(SUPPORTED_LANGS),
    });
  }

  try {
    // Fetched before the cache check (rather than after, as it used to be)
    // because we need to know whether this tender even has a description to
    // translate — a cache row from before this field existed is only
    // "complete" if it either predates description_en or already has one.
    const { data: tender, error: fetchErr } = await supabase
      .from("tenders")
      .select("id, title, title_en, summary_en, description_en, source_language")
      .eq("id", tender_id)
      .maybeSingle();

    if (fetchErr) return json(500, { error: `Tender lookup failed: ${fetchErr.message}` });
    if (!tender) return json(404, { error: "Tender not found" });

    const sourceTitle = tender.title_en ?? tender.title;
    const sourceSummary = tender.summary_en;
    const sourceDescription: string | null = tender.description_en ?? null;
    const needsDescription = !!sourceDescription;

    if (!sourceSummary) {
      return json(422, {
        error: "No English summary available to translate yet. Try again after enrichment completes.",
      });
    }

    if (lang === "en") {
      return json(200, {
        success: true, cached: false, lang,
        title: sourceTitle, summary: sourceSummary, description: sourceDescription,
      });
    }

    const { data: cachedRow } = await supabase
      .from("tender_translations")
      .select("title, summary, description")
      .eq("tender_id", tender_id)
      .eq("lang", lang)
      .maybeSingle();

    const cacheComplete =
      !!cachedRow?.title && !!cachedRow?.summary && (!needsDescription || !!cachedRow?.description);

    if (cacheComplete) {
      return json(200, {
        success: true, cached: true, lang,
        title: cachedRow!.title, summary: cachedRow!.summary, description: cachedRow!.description ?? null,
      });
    }

    const out = await translate(sourceTitle, sourceSummary, sourceDescription, lang);

    const upsertPayload: Record<string, unknown> = {
      tender_id, lang,
      title: out.title,
      summary: out.summary,
      translated_at: new Date().toISOString(),
    };
    // Only set description when we actually have one to translate — omitting
    // it (rather than writing null) leaves an already-cached value untouched
    // if this tender's description_en happened to disappear between calls.
    if (needsDescription) upsertPayload.description = out.description;

    const { error: upsertErr } = await supabase
      .from("tender_translations")
      .upsert(upsertPayload, { onConflict: "tender_id,lang" });
    if (upsertErr) throw new Error(`Cache write failed: ${upsertErr.message}`);

    return json(200, {
      success: true, cached: false, lang,
      title: out.title, summary: out.summary, description: needsDescription ? out.description : null,
    });
  } catch (err) {
    const msg = (err as Error).message;
    log.warn("translate-tender failed", { tender_id, lang, error: msg });
    return json(500, { error: msg });
  }
});
