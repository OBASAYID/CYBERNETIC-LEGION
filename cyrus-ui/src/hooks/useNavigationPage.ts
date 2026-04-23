import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { systemFetch } from "@/lib/system-api";

interface Fix {
  lat: number;
  lon: number;
  accuracy: number;
  source: string;
  timestamp: number;
  ageMs: number;
  confidence: number;
}

interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
  fetchedAt: number;
  confidence: number;
  provider: string;
  polyline?: string;
}

export function useNavigationPage() {
  const { toast } = useToast();
  const [fix, setFix] = useState<Fix | null>(null);
  const [dest, setDest] = useState("37.7749,-122.4194");
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [shareToken, setShareToken] = useState("");
  const watchId = useRef<number | null>(null);

  const fetchFix = async () => {
    try {
      const res = await systemFetch("/api/nav/fix");
      const data = (await res.json()) as {
        available?: boolean;
        fix?: (Fix & Record<string, unknown>) | null;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to fetch fix");
      }
      if (!data.available || !data.fix) {
        setFix(null);
        return;
      }
      const f = data.fix;
      setFix({
        lat: f.lat,
        lon: f.lon,
        accuracy: f.accuracy,
        source: String(f.source ?? "gps"),
        timestamp: f.timestamp,
        ageMs: typeof f.ageMs === "number" ? f.ageMs : 0,
        confidence: typeof f.confidence === "number" ? f.confidence : 0.5,
      });
    } catch (err: any) {
      toast({ title: "Fix error", description: err.message, variant: "destructive" });
    }
  };

  const setManualFix = async () => {
    try {
      const [latStr, lonStr] = dest.split(",").map((s) => s.trim());
      const body = { lat: Number(latStr), lon: Number(lonStr), accuracy: 25, source: "manual" };
      const res = await systemFetch("/api/nav/manual-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set manual fix");
      toast({ title: "Manual fix set" });
      fetchFix();
    } catch (err: any) {
      toast({ title: "Manual fix error", description: err.message, variant: "destructive" });
    }
  };

  const requestRoute = async () => {
    try {
      if (!fix) throw new Error("No current fix");
      const [latStr, lonStr] = dest.split(",").map((s) => s.trim());
      const body = {
        origin: { lat: fix.lat, lon: fix.lon },
        destination: { lat: Number(latStr), lon: Number(lonStr) },
        mode: "driving",
      };
      const res = await systemFetch("/api/nav/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Routing failed");
      setRoute(data);
      toast({ title: "Route updated", description: `${(data.distanceMeters / 1000).toFixed(1)} km` });
    } catch (err: any) {
      toast({ title: "Route error", description: err.message, variant: "destructive" });
    }
  };

  const startShare = async () => {
    try {
      const res = await systemFetch("/api/nav/share/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: "peer", durationSeconds: 600, mode: "live" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Share failed");
      setShareToken(data.token);
      toast({ title: "Sharing started", description: `Token: ${data.token}` });
    } catch (err: any) {
      toast({ title: "Share error", description: err.message, variant: "destructive" });
    }
  };

  const stopShare = async () => {
    if (!shareToken) return;
    try {
      const res = await systemFetch("/api/nav/share/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: shareToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Stop failed");
      setShareToken("");
      toast({ title: "Sharing stopped" });
    } catch (err: any) {
      toast({ title: "Stop error", description: err.message, variant: "destructive" });
    }
  };

  const startGps = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation unsupported", variant: "destructive" });
      return;
    }
    if (watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          const body = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 50,
            source: "gps",
            timestamp: pos.timestamp,
          };
          await systemFetch("/api/nav/manual-fix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          fetchFix();
        } catch (err) {
          console.error("gps update failed", err);
        }
      },
      (err) => {
        toast({ title: "GPS error", description: err.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 },
    );
    toast({ title: "GPS tracking enabled" });
  };

  const stopGps = () => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      toast({ title: "GPS tracking stopped" });
    }
  };

  useEffect(() => {
    fetchFix();
    return () => {
      stopGps();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    fix,
    dest,
    setDest,
    route,
    shareToken,
    fetchFix,
    setManualFix,
    requestRoute,
    startShare,
    stopShare,
    startGps,
    stopGps,
  };
}

