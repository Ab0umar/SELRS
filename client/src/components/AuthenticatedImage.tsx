import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/const";

type AuthenticatedImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

type CachedImageEntry = {
  objectUrl?: string;
  promise?: Promise<string | null>;
};

const authenticatedImageCache = new Map<string, CachedImageEntry>();

function guessImageMimeType(url: string) {
  const normalized = String(url ?? "").toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".bmp")) return "image/bmp";
  if (normalized.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function getAuthHeaders() {
  if (typeof window === "undefined") return undefined;
  const token =
    window.localStorage.getItem("token") ??
    window.sessionStorage.getItem("token") ??
    "";
  if (!token) return undefined;
  return {
    authorization: `Bearer ${token}`,
  };
}

async function loadAuthenticatedImage(normalizedSrc: string, headers?: Record<string, string>) {
  const cached = authenticatedImageCache.get(normalizedSrc);
  if (cached?.objectUrl) return cached.objectUrl;
  if (cached?.promise) return cached.promise;

  const promise = (async () => {
    let blob: Blob;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        url: normalizedSrc,
        method: "GET",
        headers,
        connectTimeout: 15_000,
        readTimeout: 15_000,
        responseType: "arraybuffer",
      });
      const rawData = response.data as unknown;
      let bytes: Uint8Array;
      if (rawData instanceof ArrayBuffer) {
        bytes = new Uint8Array(rawData);
      } else if (ArrayBuffer.isView(rawData as ArrayBufferView)) {
        bytes = new Uint8Array((rawData as ArrayBufferView).buffer);
      } else if (typeof rawData === "string") {
        const binary = atob(rawData);
        bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
      } else {
        return null;
      }
      const mimeType =
        String((response.headers as Record<string, string> | undefined)?.["content-type"] ?? "").trim() ||
        guessImageMimeType(normalizedSrc);
      const copiedBytes = new Uint8Array(bytes.byteLength);
      copiedBytes.set(bytes);
      blob = new Blob([copiedBytes.buffer as ArrayBuffer], { type: mimeType });
    } else {
      const response = await fetch(normalizedSrc, {
        credentials: "include",
        headers,
      });
      if (!response.ok) return null;
      blob = await response.blob();
    }

    if (!blob.type.startsWith("image/")) return null;
    const objectUrl = URL.createObjectURL(blob);
    authenticatedImageCache.set(normalizedSrc, { objectUrl });
    return objectUrl;
  })().catch(() => {
    authenticatedImageCache.delete(normalizedSrc);
    return null;
  });

  authenticatedImageCache.set(normalizedSrc, { promise });
  return promise;
}

export async function prefetchAuthenticatedImage(src: string) {
  const raw = String(src ?? "").trim();
  if (!raw) return null;
  const normalizedSrc = /^https?:\/\//i.test(raw)
    ? raw
    : getApiUrl(raw.startsWith("/") ? raw : `/${raw}`);
  return loadAuthenticatedImage(normalizedSrc, getAuthHeaders());
}

export default function AuthenticatedImage({
  src,
  alt,
  className,
  loading = "lazy",
}: AuthenticatedImageProps) {
  const normalizedSrc = useMemo(() => {
    const raw = String(src ?? "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return getApiUrl(raw.startsWith("/") ? raw : `/${raw}`);
  }, [src]);
  const authHeaders = useMemo(() => getAuthHeaders(), []);
  const [resolvedSrc, setResolvedSrc] = useState(() => {
    if (!normalizedSrc) return "";
    const cached = authenticatedImageCache.get(normalizedSrc);
    if (cached?.objectUrl) return cached.objectUrl;
    return authHeaders ? "" : normalizedSrc;
  });

  useEffect(() => {
    if (!normalizedSrc) {
      setResolvedSrc("");
      return;
    }

    let cancelled = false;

    const cached = authenticatedImageCache.get(normalizedSrc);
    if (cached?.objectUrl) {
      setResolvedSrc(cached.objectUrl);
      return () => {
        cancelled = true;
      };
    }

    if (!authHeaders) {
      setResolvedSrc(normalizedSrc);
      return () => {
        cancelled = true;
      };
    }

    setResolvedSrc("");

    const run = async () => {
      try {
        const objectUrl = await loadAuthenticatedImage(normalizedSrc, authHeaders);
        if (!cancelled) {
          setResolvedSrc(objectUrl || normalizedSrc);
        }
      } catch {
        // Fall back to direct src if authenticated fetch fails.
        if (!cancelled) {
          setResolvedSrc(normalizedSrc);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [authHeaders, normalizedSrc]);

  return <img src={resolvedSrc || undefined} alt={alt} className={cn(className)} loading={loading} />;
}
