import { AppState } from "./types";

const APP_STATE_TABLE = "app_state";
const APP_STATE_ID = import.meta.env.VITE_APP_STATE_ROW_ID || "single-lodge";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function buildHeaders(extraHeaders?: HeadersInit) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

async function parseResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed with ${response.status}`);
  }

  return response;
}

export function isRemoteConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function fetchRemoteState() {
  if (!isRemoteConfigured()) {
    return null;
  }

  const query = `${APP_STATE_TABLE}?id=eq.${encodeURIComponent(APP_STATE_ID)}&select=data`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: buildHeaders(),
  });
  const parsed = await parseResponse(response);
  const rows = (await parsed.json()) as Array<{ data: AppState }>;

  return rows[0]?.data ?? null;
}

export async function saveRemoteState(state: AppState) {
  if (!isRemoteConfigured()) {
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${APP_STATE_TABLE}`, {
    method: "POST",
    headers: buildHeaders({
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify({
      id: APP_STATE_ID,
      data: state,
    }),
  });

  await parseResponse(response);
}
