import { useEffect, useState } from "react";
import { getCommunityMediaUrl } from "../api";

export function CommunityMedia({ path, alt, className = "" }: { path: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let alive = true; if (!path) { setUrl(null); return; } getCommunityMediaUrl(path).then((u) => { if (alive) setUrl(u); }).catch(() => { if (alive) setUrl(null); }); return () => { alive = false; }; }, [path]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}
