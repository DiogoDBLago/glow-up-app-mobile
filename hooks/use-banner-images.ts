import { useEffect, useState } from "react";
import { supabase } from "@/supabase/client";

export type BannerCategory =
  | "workout"
  | "rest"
  | "nutrition"
  | "cycle"
  | "cardio";

type BannerMap = Partial<Record<BannerCategory, string>>;

let cache: BannerMap | null = null;
let inflight: Promise<BannerMap> | null = null;

async function fetchBanners(): Promise<BannerMap> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("banner_images")
      .select("category, image_url");
    if (error) {
      console.warn("[banner_images] fetch failed", error.message);
      return {};
    }
    const map: BannerMap = {};
    for (const row of data ?? []) {
      map[row.category as BannerCategory] = row.image_url as string;
    }
    cache = map;
    return map;
  })();
  return inflight;
}

/**
 * useBannerImages — reads the category → image URL map from Supabase
 * (table `banner_images`). URLs are admin-editable; no code change required
 * to swap an image.
 */
export function useBannerImages() {
  const [images, setImages] = useState<BannerMap>(cache ?? {});
  useEffect(() => {
    let alive = true;
    fetchBanners().then((m) => {
      if (alive) setImages(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return images;
}
