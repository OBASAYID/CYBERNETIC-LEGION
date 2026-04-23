import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";

export interface Position {
  lat: number;
  lon: number;
  accuracy: number;
  source: "gps" | "network" | "manual";
  timestamp: number;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

export interface RouteSummary {
  origin: { lat: number; lon: number };
  destination: { lat: number; lon: number };
  totalDistance: string;
  totalDuration: string;
  steps: RouteStep[];
  polyline?: string;
}

export interface ShareSession {
  token: string;
  recipientId: string;
  expiresAt: string;
  mode: "live" | "snapshot";
}

export function useNavigation() {
  const queryClient = useQueryClient();
  const [watchId, setWatchId] = useState<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lon: number } | null>(null);
  const [activeShare, setActiveShare] = useState<ShareSession | null>(null);

  const positionQuery = useQuery<Position>({
    queryKey: ["/api/nav/position"],
    queryFn: async () => {
      const res = await systemFetch("/api/nav/position");
      if (!res.ok) throw new Error("Failed to fetch position");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const startGPSWatch = useCallback(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const position: Position = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "gps",
          timestamp: pos.timestamp,
        };
        setCurrentPosition(position);
        systemFetch("/api/nav/position", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(position),
        });
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setWatchId(id);
  }, []);

  const stopGPSWatch = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const setManualPosition = useMutation({
    mutationFn: async (position: { lat: number; lon: number; accuracy?: number }) => {
      const res = await systemFetch("/api/nav/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...position,
          accuracy: position.accuracy || 100,
          source: "manual",
        }),
      });
      if (!res.ok) throw new Error("Failed to set position");
      const result = await res.json();
      setCurrentPosition(result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nav/position"] });
    },
  });

  const getRoute = useMutation({
    mutationFn: async ({
      origin,
      destination,
      mode = "driving",
    }: {
      origin: { lat: number; lon: number };
      destination: { lat: number; lon: number };
      mode?: "driving" | "walking" | "bicycling";
    }) => {
      const res = await systemFetch("/api/nav/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, mode }),
      });
      if (!res.ok) throw new Error("Failed to get route");
      return res.json();
    },
  });

  const startShare = useMutation({
    mutationFn: async ({
      recipientId,
      durationSeconds,
      mode = "live",
    }: {
      recipientId: string;
      durationSeconds: number;
      mode?: "live" | "snapshot";
    }) => {
      const res = await systemFetch("/api/nav/share/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, durationSeconds, mode }),
      });
      if (!res.ok) throw new Error("Failed to start share");
      const session = await res.json();
      setActiveShare(session);
      return session;
    },
  });

  const stopShare = useMutation({
    mutationFn: async (token: string) => {
      const res = await systemFetch("/api/nav/share/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Failed to stop share");
      setActiveShare(null);
      return res.json();
    },
  });

  const getSharedLocation = useMutation({
    mutationFn: async (token: string) => {
      const res = await systemFetch(`/api/nav/share/${token}`);
      if (!res.ok) throw new Error("Failed to get shared location");
      return res.json();
    },
  });

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    currentPosition: currentPosition || positionQuery.data || null,
    destination,
    setDestination,
    activeShare,
    isWatching: watchId !== null,
    startGPSWatch,
    stopGPSWatch,
    setManualPosition,
    getRoute,
    startShare,
    stopShare,
    getSharedLocation,
    isLoading: positionQuery.isLoading,
    isRouting: getRoute.isPending,
  };
}
