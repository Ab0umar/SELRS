import { useEffect, useState } from "react";

export function useTextZoom() {
  const [zoom, setZoom] = useState(100);

  const setZoomLevel = (level: number) => {
    // Clamp between 50% and 200%
    const clampedLevel = Math.max(50, Math.min(200, level));
    setZoom(clampedLevel);

    // Adjust document font size (works on all platforms)
    document.documentElement.style.fontSize = `${(16 * clampedLevel) / 100}px`;
    localStorage.setItem("selrs:text-zoom", String(clampedLevel));
  };

  useEffect(() => {
    // Load saved zoom level
    const saved = localStorage.getItem("selrs:text-zoom");
    if (saved) {
      const level = parseInt(saved, 10);
      setZoom(level);
      document.documentElement.style.fontSize = `${(16 * level) / 100}px`;
    }
  }, []);

  return {
    zoom,
    setZoom: setZoomLevel,
    increase: () => setZoomLevel(zoom + 10),
    decrease: () => setZoomLevel(zoom - 10),
    reset: () => setZoomLevel(100),
  };
}
