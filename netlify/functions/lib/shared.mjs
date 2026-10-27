export const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=300" },
  body: JSON.stringify(body),
});

export class UpstreamError extends Error {
  constructor(provider, status) {
    super(`${provider} returned ${status}`);
    this.provider = provider;
    this.status = status;
  }
}

export async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new UpstreamError(new URL(url).hostname, response.status);
  return response.json();
}

export function failure(error) {
  const status = error instanceof UpstreamError && error.status === 429 ? 429 : 502;
  const message = error instanceof UpstreamError
    ? error.status === 429 ? "The stats provider is rate limiting requests. Try again shortly."
      : error.status === 401 || error.status === 403 ? "The provider rejected the API key or access to this profile."
      : error.status === 404 ? "The provider could not find this profile."
      : "The stats provider is temporarily unavailable."
    : "The stats provider did not respond. Try again shortly.";
  return json(status, { state: "error", message });
}

export const number = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
