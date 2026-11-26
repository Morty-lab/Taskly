import { useEffect, useState } from "react";
import { useAuth } from "./auth.tsx";

// Stored files (resume, photo) come through our server, which checks the caller owns the file or is
// an admin. Fetching with a JWT avoids depending on Appwrite's third-party session cookie.

async function fetchFile(jwt: string, fileId: string): Promise<Blob> {
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, { headers: { Authorization: `Bearer ${jwt}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Couldn't load the file (${res.status}).`);
  }
  return res.blob();
}

/** An object URL for a stored image, or null while loading / when there is none. */
export function useFileUrl(fileId: string | null | undefined) {
  const { jwt } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!fileId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    jwt()
      .then((t) => fetchFile(t, fileId))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, jwt]);
  return url;
}

/** Download a stored file under its original name. */
export async function downloadFile(jwt: string, fileId: string, name: string) {
  const blob = await fetchFile(jwt, fileId);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PHOTO_SIZE = 600;

/**
 * Crop an image to a centred square and re-encode it as a 600px JPEG, like a 2x2 ID photo. Keeps
 * uploads small, strips camera metadata (EXIF location), and needs no server-side image processing.
 */
export async function squarePhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|gif|avif|bmp)$/.test(file.type)) {
    throw new Error("Use a JPG, PNG or WebP photo. iPhone HEIC photos: set Camera → Formats → Most Compatible, or export as JPEG.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("That photo is over 25 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that image. Try a different photo.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(PHOTO_SIZE, side);
  const ctx = canvas.getContext("2d")!;
  // Centre horizontally; bias upward a little so faces in portrait photos aren't cut at the forehead.
  const sx = (bitmap.width - side) / 2;
  const sy = Math.max(0, (bitmap.height - side) * 0.3);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  if (!blob) throw new Error("Couldn't process that image.");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
