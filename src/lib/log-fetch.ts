const SENSITIVE_QUERY_KEYS = new Set([
  "api_key",
  "apikey",
  "auth_token",
  "token",
  "key",
  "signature",
]);

const RESPONSE_SNIPPET_LENGTH = 300;

const sanitizeUrl = (input: string) => {
  try {
    const url = new URL(input);
    url.searchParams.forEach((value, key) => {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, "***");
      }
    });
    return url.toString();
  } catch {
    return input;
  }
};

const sanitizeBody = (body: unknown) => {
  if (typeof body === "string") {
    return body.replace(
      /(\"?(?:api_key|apikey|auth_token|token|key|signature)\"?\s*:\s*\")([^\"]+)/gi,
      "$1***"
    );
  }
  if (body && typeof body === "object") {
    try {
      return JSON.stringify(body).replace(
        /(\"?(?:api_key|apikey|auth_token|token|key|signature)\"?\s*:\s*\")([^\"]+)/gi,
        "$1***"
      );
    } catch {
      return String(body);
    }
  }
  return body === undefined ? undefined : String(body);
};

let installed = false;

export const installFetchLogger = () => {
  if (installed) {
    return;
  }
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (() => {
      if (init?.method) return init.method;
      if (input instanceof Request) return input.method;
      return "GET";
    })().toUpperCase();

    const urlString = (() => {
      if (typeof input === "string") return input;
      if (input instanceof URL) return input.toString();
      if (input instanceof Request) return input.url;
      return String(input);
    })();

    const redactedUrl = sanitizeUrl(urlString);
    const sanitizedBody = sanitizeBody(init?.body);

    console.log("[Fetch] Request", {
      method,
      url: redactedUrl,
      hasBody: sanitizedBody !== undefined,
      body: typeof sanitizedBody === "string"
        ? sanitizedBody.slice(0, RESPONSE_SNIPPET_LENGTH)
        : sanitizedBody,
    });

    try {
      const response = await originalFetch(input as RequestInfo, init);
      const snippet = await response
        .clone()
        .text()
        .then((text) => text.slice(0, RESPONSE_SNIPPET_LENGTH))
        .catch(() => "");
      console.log("[Fetch] Response", {
        method,
        url: redactedUrl,
        status: response.status,
        statusText: response.statusText,
        body: snippet,
      });
      return response;
    } catch (error) {
      console.error("[Fetch] Error", {
        method,
        url: redactedUrl,
        error,
      });
      throw error;
    }
  }) as typeof fetch;
  installed = true;
};

