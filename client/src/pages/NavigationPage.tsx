import { useState, useEffect, useCallback, useRef } from "react";
import { systemFetch } from "@shared/cyrus-api-client";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline, Circle } from "@react-google-maps/api";
import { useNavigation } from "../hooks/useNavigation";
import { CyrusHumanoid } from "../components/CyrusHumanoid";
import { Link } from "wouter";
import {
  MapPin,
  Navigation,
  Share2,
  Crosshair,
  Route,
  Clock,
  Play,
  Square,
  Send,
  Compass,
  Globe,
  Satellite,
  Layers,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Gauge,
  Mountain,
  Radio,
  Shield,
  Target,
  Plane,
  Copy,
  Check,
  LayoutGrid,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "0px",
};

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8e8e93" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1d1d1f" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a3c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a84ff" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4f5b62" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#28282a" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a3a1a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#28282a" }] },
];

const libraries: ("places" | "geometry" | "drawing")[] = ["places", "geometry"];

function useGoogleMapsApiKey() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");
  const [loading, setLoading] = useState(!apiKey);

  useEffect(() => {
    if (!apiKey) {
      systemFetch("/api/nav/maps-config")
        .then(res => res.json())
        .then(data => {
          if (data.apiKey) setApiKey(data.apiKey);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  return { apiKey, loading };
}

function getCardinalDirection(heading: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}

function formatCoordinate(value: number, type: "lat" | "lon"): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = ((abs - deg - min / 60) * 3600).toFixed(2);
  const dir = type === "lat" ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
  return `${deg}° ${min}' ${sec}" ${dir}`;
}

export function NavigationPage() {
  const { apiKey, loading: apiKeyLoading } = useGoogleMapsApiKey();

  if (apiKeyLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#0a84ff] animate-spin mx-auto mb-3" />
          <p className="text-[rgba(235,235,245,0.6)] text-sm">Initializing Navigation Module...</p>
        </div>
      </div>
    );
  }

  return <NavigationPageInner apiKey={apiKey} />;
}

function NavigationPageInner({ apiKey }: { apiKey: string }) {
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLon, setDestLon] = useState("");
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareDuration, setShareDuration] = useState(300);
  const [travelMode, setTravelMode] = useState<"driving" | "walking" | "bicycling">("driving");
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid">("roadmap");
  const [locationName, setLocationName] = useState<string>("");
  const [showInfoWindow, setShowInfoWindow] = useState(true);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(15);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(0);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [activePanel, setActivePanel] = useState<"tracking" | "route" | "share">("tracking");
  const autoStartedRef = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const {
    currentPosition,
    activeShare,
    isWatching,
    startGPSWatch,
    stopGPSWatch,
    setManualPosition,
    getRoute,
    startShare,
    stopShare,
    isLoading,
    isRouting,
  } = useNavigation();

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    if (!isLoaded || !window.google) return;
    
    const geocoder = new google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng: lon } });
      if (response.results[0]) {
        setLocationName(response.results[0].formatted_address);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setLocationName("Unknown location");
    }
  }, [isLoaded]);

  useEffect(() => {
    if (currentPosition && isLoaded && (currentPosition.lat !== 0 || currentPosition.lon !== 0)) {
      reverseGeocode(currentPosition.lat, currentPosition.lon);
    }
  }, [currentPosition, isLoaded, reverseGeocode]);

  useEffect(() => {
    if (isLoaded && !autoStartedRef.current && !isWatching) {
      autoStartedRef.current = true;
      startGPSWatch();
    }
  }, [isLoaded, isWatching, startGPSWatch]);

  useEffect(() => {
    if (navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.heading !== null && pos.coords.heading !== undefined) {
            setHeading(pos.coords.heading);
          }
          if (pos.coords.speed !== null && pos.coords.speed !== undefined) {
            setSpeed(pos.coords.speed);
          }
          if (pos.coords.altitude !== null && pos.coords.altitude !== undefined) {
            setAltitude(pos.coords.altitude);
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, []);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const handleSetManualPosition = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setManualPosition.mutate({ lat, lon });
    }
  };

  const handleGetRoute = () => {
    if (!currentPosition) return;
    const lat = parseFloat(destLat);
    const lon = parseFloat(destLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      getRoute.mutate({
        origin: { lat: currentPosition.lat, lon: currentPosition.lon },
        destination: { lat, lon },
        mode: travelMode,
      });
    }
  };

  const handleStartShare = () => {
    if (!shareRecipient.trim()) return;
    startShare.mutate({
      recipientId: shareRecipient,
      durationSeconds: shareDuration,
      mode: "live",
    });
  };

  const centerOnPosition = () => {
    if (map && currentPosition) {
      map.panTo({ lat: currentPosition.lat, lng: currentPosition.lon });
      map.setZoom(17);
    }
  };

  const handleZoomIn = () => {
    if (map) {
      const newZoom = Math.min((map.getZoom() || 15) + 1, 21);
      map.setZoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const newZoom = Math.max((map.getZoom() || 15) - 1, 1);
      map.setZoom(newZoom);
      setZoom(newZoom);
    }
  };

  const copyCoordinates = () => {
    if (currentPosition) {
      navigator.clipboard.writeText(`${currentPosition.lat.toFixed(6)}, ${currentPosition.lon.toFixed(6)}`);
      setCopiedCoord(true);
      setTimeout(() => setCopiedCoord(false), 2000);
    }
  };

  const defaultCenter = { lat: -24.6282, lng: 25.9231 };

  return (
    <ModuleWorkspacePageShell mode="page">
    <div className="flex min-h-full h-screen min-h-0 flex-col overflow-hidden bg-[#000000]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[rgba(84,84,88,0.35)] bg-[rgba(10,10,12,0.95)] backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="w-10 h-10 bg-gradient-to-br from-[#30d158] to-[#00c853] rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white">Satellite Navigation</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-[rgba(235,235,245,0.5)]">Geospatial Intelligence</span>
              {isWatching && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[rgba(48,209,88,0.15)] text-[#30d158] text-[9px] font-bold rounded-full">
                  <span className="w-1.5 h-1.5 bg-[#30d158] rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-[rgba(118,118,128,0.24)] rounded-lg p-0.5">
            {[
              { type: "roadmap" as const, label: "Map" },
              { type: "satellite" as const, label: "Satellite" },
              { type: "hybrid" as const, label: "Hybrid" },
            ].map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setMapType(type)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                  mapType === type
                    ? "bg-[#0a84ff] text-white shadow-sm"
                    : "text-[rgba(235,235,245,0.6)] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Map console: same “module workspace” shell as the main dashboard */}
        <aside className="relative z-0 order-2 flex w-full max-h-[min(55vh,420px)] shrink-0 flex-col p-1.5 sm:p-2 lg:order-1 lg:max-h-none lg:w-[min(20rem,92vw)] lg:max-w-[300px]">
          <section
            className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-1 shadow-[0_0_60px_-20px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]"
            aria-label="Position and telemetry"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.4) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-orange-500/10" />
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/45 backdrop-blur-sm">
              <div className="shrink-0 border-b border-white/10 p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                    <LayoutGrid className="h-5 w-5 text-cyan-300" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-200/60">Field access</p>
                    <h2
                      className="mt-0.5 bg-gradient-to-r from-cyan-100 via-white to-orange-200/90 bg-clip-text text-base font-bold tracking-tight text-transparent"
                      style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                    >
                      Map console
                    </h2>
                    <p className="mt-1 text-xs text-white/70">Live position and motion—same frame language as the module workspace.</p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
                {!currentPosition ? (
                  <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-500/25 bg-cyan-500/[0.04] px-4 py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/50">
                      <Crosshair className="h-5 w-5 text-cyan-400/40" />
                    </div>
                    <p className="text-xs text-white/65">No GPS fix yet</p>
                    <p className="max-w-[14rem] text-[10px] leading-relaxed text-white/40">
                      Use Track to start GPS—readings appear in this console.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/80 shadow-[0_0_32px_-14px_rgba(34,211,238,0.35)]">
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90"
                          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                        >
                          Fix active
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[12px] font-semibold text-white/95 sm:text-[13px]">
                        {locationName || "Resolving location..."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2">
                      <div>
                        <p className="text-[9px] font-mono font-medium uppercase tracking-widest text-cyan-200/45">Latitude</p>
                        <p className="text-[12px] font-mono font-bold text-cyan-300/95 sm:text-[13px]">{currentPosition.lat.toFixed(6)}</p>
                        <p className="text-[8px] font-mono text-white/30">{formatCoordinate(currentPosition.lat, "lat")}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-mono font-medium uppercase tracking-widest text-orange-200/45">Longitude</p>
                        <p className="text-[12px] font-mono font-bold text-orange-200/90 sm:text-[13px]">{currentPosition.lon.toFixed(6)}</p>
                        <p className="text-[8px] font-mono text-white/30">{formatCoordinate(currentPosition.lon, "lon")}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 border-t border-white/10 px-1.5 py-2 sm:px-2">
                      <div className="text-center">
                        <Mountain className="mx-auto mb-0.5 h-3 w-3 text-amber-400" />
                        <p className="text-[8px] font-mono uppercase tracking-wider text-white/40">ALT</p>
                        <p className="text-[10px] font-mono font-bold text-amber-200/90 sm:text-[11px]">{altitude.toFixed(0)}m</p>
                      </div>
                      <div className="text-center">
                        <Gauge className="mx-auto mb-0.5 h-3 w-3 text-cyan-400" />
                        <p className="text-[8px] font-mono uppercase tracking-wider text-white/40">SPD</p>
                        <p className="text-[10px] font-mono font-bold text-cyan-200/90 sm:text-[11px]">
                          {(speed * 3.6).toFixed(1)}
                          <span className="text-[8px]">km/h</span>
                        </p>
                      </div>
                      <div className="text-center">
                        <Compass className="mx-auto mb-0.5 h-3 w-3 text-orange-400" />
                        <p className="text-[8px] font-mono uppercase tracking-wider text-white/40">HDG</p>
                        <p className="text-[10px] font-mono font-bold text-orange-200/90 sm:text-[11px]">
                          {heading.toFixed(0)}° {getCardinalDirection(heading)}
                        </p>
                      </div>
                      <div className="text-center">
                        <Shield className="mx-auto mb-0.5 h-3 w-3 text-cyan-300/80" />
                        <p className="text-[8px] font-mono uppercase tracking-wider text-white/40">ACC</p>
                        <p className="text-[10px] font-mono font-bold text-cyan-200/90 sm:text-[11px]">
                          {(currentPosition.accuracy || 0).toFixed(0)}m
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-white/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="line-clamp-2 text-[8px] text-white/40 sm:text-[9px]">
                        SRC: {currentPosition.source?.toUpperCase() || "GPS"} · {new Date().toLocaleTimeString()}
                      </span>
                      <button
                        type="button"
                        onClick={copyCoordinates}
                        className="inline-flex items-center gap-1 self-start rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-medium text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 sm:self-auto"
                      >
                        {copiedCoord ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedCoord ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>

        <div className="relative order-1 flex min-h-[min(50vh,28rem)] min-w-0 flex-1 flex-col p-1.5 sm:p-2 lg:order-2 lg:min-h-0">
          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-1 shadow-[0_0_60px_-20px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.4) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-orange-500/10" />
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/45">
            <div className="relative h-full min-h-0 min-w-0 flex-1">
          {!apiKey ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e]">
              <div className="text-center p-8 max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#ff9f0a] to-[#ff375f] rounded-3xl flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-3">Google Maps API Required</h2>
                <p className="text-[rgba(235,235,245,0.6)] text-sm mb-4">
                  To enable real-time maps and GPS features, please configure your Google Maps API key.
                </p>
              </div>
            </div>
          ) : loadError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e]">
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#ff375f] rounded-2xl flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Maps JavaScript API Not Activated</h2>
                <p className="text-[rgba(235,235,245,0.6)] text-sm mb-3">
                  Enable it in Google Cloud Console.
                </p>
              </div>
            </div>
          ) : !isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-3 border-[#0a84ff] border-t-transparent rounded-full animate-spin" />
                <p className="text-[rgba(235,235,245,0.6)]">Loading maps...</p>
              </div>
            </div>
          ) : (
            <>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={currentPosition ? { lat: currentPosition.lat, lng: currentPosition.lon } : defaultCenter}
                zoom={zoom}
                onLoad={onMapLoad}
                options={{
                  styles: darkMapStyles,
                  mapTypeId: mapType,
                  disableDefaultUI: true,
                  zoomControl: false,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                }}
              >
                {currentPosition && (
                  <>
                    <Circle
                      center={{ lat: currentPosition.lat, lng: currentPosition.lon }}
                      radius={currentPosition.accuracy || 50}
                      options={{
                        fillColor: "#0a84ff",
                        fillOpacity: 0.08,
                        strokeColor: "#0a84ff",
                        strokeOpacity: 0.25,
                        strokeWeight: 1,
                      }}
                    />
                    <Marker
                      position={{ lat: currentPosition.lat, lng: currentPosition.lon }}
                      onClick={() => setShowInfoWindow(!showInfoWindow)}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#0a84ff",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 3,
                      }}
                    />
                  </>
                )}
                {currentPosition && showInfoWindow && (
                  <InfoWindow
                    position={{ lat: currentPosition.lat, lng: currentPosition.lon }}
                    onCloseClick={() => setShowInfoWindow(false)}
                  >
                    <div className="p-2 text-black min-w-[200px]">
                      <p className="font-bold text-sm mb-1">Your Location</p>
                      <p className="text-xs text-gray-600 mb-2">{locationName || "Resolving..."}</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-gray-400">LAT</span>
                          <p className="font-mono font-bold text-green-700">{currentPosition.lat.toFixed(6)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">LON</span>
                          <p className="font-mono font-bold text-blue-700">{currentPosition.lon.toFixed(6)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">ALT</span>
                          <p className="font-mono">{altitude.toFixed(1)}m</p>
                        </div>
                        <div>
                          <span className="text-gray-400">ACC</span>
                          <p className="font-mono">{(currentPosition.accuracy || 0).toFixed(0)}m</p>
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>

              <div className="absolute right-3 top-3 flex flex-col gap-2 z-10">
                <div className="bg-[rgba(20,20,22,0.92)] backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl border border-[rgba(84,84,88,0.35)]">
                  <button
                    onClick={handleZoomIn}
                    className="w-10 h-10 flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="h-px bg-[rgba(84,84,88,0.35)]" />
                  <button
                    onClick={handleZoomOut}
                    className="w-10 h-10 flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={centerOnPosition}
                  disabled={!currentPosition}
                  className="w-10 h-10 bg-[rgba(20,20,22,0.92)] backdrop-blur-xl rounded-xl flex items-center justify-center text-[#0a84ff] hover:bg-[rgba(255,255,255,0.1)] transition-colors disabled:opacity-30 shadow-2xl border border-[rgba(84,84,88,0.35)]"
                >
                  <LocateFixed className="w-4 h-4" />
                </button>
                <button
                  onClick={() => isWatching ? stopGPSWatch() : startGPSWatch()}
                  className={`w-10 h-10 backdrop-blur-xl rounded-xl flex items-center justify-center transition-colors shadow-2xl border ${
                    isWatching 
                      ? "bg-[rgba(48,209,88,0.2)] border-[rgba(48,209,88,0.4)] text-[#30d158]" 
                      : "bg-[rgba(20,20,22,0.92)] border-[rgba(84,84,88,0.35)] text-gray-400"
                  }`}
                >
                  {isWatching ? <Radio className="w-4 h-4" /> : <Crosshair className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
            </div>
            </div>
          </section>
        </div>

        <div className="order-3 flex w-full min-h-0 min-w-0 flex-col p-1.5 sm:p-2 lg:order-3 lg:w-72 lg:shrink-0">
          <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-1 shadow-[0_0_50px_-18px_rgba(34,211,238,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.4) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-orange-500/10" />
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
            <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/45 backdrop-blur-sm">
          <div className="flex shrink-0 border-b border-white/10">
            {[
              { id: "tracking" as const, icon: Crosshair, label: "Track" },
              { id: "route" as const, icon: Route, label: "Route" },
              { id: "share" as const, icon: Share2, label: "Share" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActivePanel(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 font-mono text-[10px] font-medium uppercase tracking-wider transition-all border-b-2 ${
                  activePanel === id
                    ? "border-cyan-400/60 text-cyan-200 shadow-[0_8px_20px_-8px_rgba(34,211,238,0.35)]"
                    : "border-transparent text-white/40 hover:text-white/85"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {activePanel === "tracking" && (
              <>
                <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[rgba(84,84,88,0.35)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-3.5 h-3.5 text-[#30d158]" />
                      <span className="text-[12px] font-semibold">GPS Tracking</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isWatching ? "bg-[#30d158] animate-pulse" : "bg-[#48484a]"}`} />
                  </div>
                  
                  <button
                    onClick={() => isWatching ? stopGPSWatch() : startGPSWatch()}
                    className={`w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-2 ${
                      isWatching
                        ? "bg-[#ff375f] text-white"
                        : "bg-[#30d158] text-white"
                    }`}
                  >
                    {isWatching ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isWatching ? "Stop Tracking" : "Start Tracking"}
                  </button>
                </div>

                <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[rgba(84,84,88,0.35)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-3.5 h-3.5 text-[#0a84ff]" />
                    <span className="text-[12px] font-semibold">Manual Position</span>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Latitude (e.g. -24.6282)"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2c2c2e] rounded-lg text-[12px] placeholder-[rgba(235,235,245,0.25)] border border-[rgba(84,84,88,0.35)] focus:border-[#0a84ff] focus:outline-none transition-colors font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Longitude (e.g. 25.9231)"
                      value={manualLon}
                      onChange={(e) => setManualLon(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2c2c2e] rounded-lg text-[12px] placeholder-[rgba(235,235,245,0.25)] border border-[rgba(84,84,88,0.35)] focus:border-[#0a84ff] focus:outline-none transition-colors font-mono"
                    />
                    <button
                      onClick={handleSetManualPosition}
                      disabled={isLoading}
                      className="w-full py-2 bg-[#0a84ff] text-white rounded-lg text-[12px] font-semibold hover:bg-[#0070d4] transition-colors disabled:opacity-50"
                    >
                      Set Position
                    </button>
                  </div>
                </div>

                {currentPosition && (
                  <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[rgba(84,84,88,0.35)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3.5 h-3.5 text-[#ff9f0a]" />
                      <span className="text-[12px] font-semibold">Position Data</span>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[rgba(235,235,245,0.4)]">Source</span>
                        <span className="font-mono text-[#30d158]">{currentPosition.source?.toUpperCase() || "GPS"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[rgba(235,235,245,0.4)]">Altitude</span>
                        <span className="font-mono">{altitude.toFixed(1)}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[rgba(235,235,245,0.4)]">Speed</span>
                        <span className="font-mono">{(speed * 3.6).toFixed(1)} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[rgba(235,235,245,0.4)]">Heading</span>
                        <span className="font-mono">{heading.toFixed(0)}° {getCardinalDirection(heading)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[rgba(235,235,245,0.4)]">Accuracy</span>
                        <span className="font-mono">{(currentPosition.accuracy || 0).toFixed(0)}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[rgba(235,235,245,0.4)]">Updated</span>
                        <span className="font-mono">{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Link href="/drone">
                  <button className="w-full bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3 hover:border-cyan-400/50 transition-all group">
                    <div className="w-8 h-8 bg-cyan-600/30 rounded-lg flex items-center justify-center">
                      <Plane className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-semibold text-cyan-400">Drone Operations</p>
                      <p className="text-[9px] text-[rgba(235,235,245,0.4)]">NAV-guided flight control</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400/50 ml-auto group-hover:text-cyan-400 transition-colors" />
                  </button>
                </Link>
              </>
            )}

            {activePanel === "route" && (
              <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[rgba(84,84,88,0.35)]">
                <div className="flex items-center gap-2 mb-3">
                  <Route className="w-3.5 h-3.5 text-[#ff9f0a]" />
                  <span className="text-[12px] font-semibold">Route Planning</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    {(["driving", "walking", "bicycling"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTravelMode(mode)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          travelMode === mode
                            ? "bg-[#ff9f0a] text-black"
                            : "bg-[#2c2c2e] text-[rgba(235,235,245,0.6)] hover:text-white"
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Destination Latitude"
                    value={destLat}
                    onChange={(e) => setDestLat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#2c2c2e] rounded-lg text-[12px] placeholder-[rgba(235,235,245,0.25)] border border-[rgba(84,84,88,0.35)] focus:border-[#ff9f0a] focus:outline-none transition-colors font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Destination Longitude"
                    value={destLon}
                    onChange={(e) => setDestLon(e.target.value)}
                    className="w-full px-3 py-2 bg-[#2c2c2e] rounded-lg text-[12px] placeholder-[rgba(235,235,245,0.25)] border border-[rgba(84,84,88,0.35)] focus:border-[#ff9f0a] focus:outline-none transition-colors font-mono"
                  />
                  <button
                    onClick={handleGetRoute}
                    disabled={!currentPosition || isRouting}
                    className="w-full py-2 bg-[#ff9f0a] text-black rounded-lg text-[12px] font-semibold hover:bg-[#e08f00] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isRouting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {isRouting ? "Calculating..." : "Get Route"}
                  </button>
                </div>

                {getRoute.data && (
                  <div className="mt-3 pt-3 border-t border-[rgba(84,84,88,0.35)] space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[rgba(235,235,245,0.4)]">Distance</span>
                      <span className="font-semibold text-[#ff9f0a]">{getRoute.data.totalDistance}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[rgba(235,235,245,0.4)]">Duration</span>
                      <span className="font-semibold">{getRoute.data.totalDuration}</span>
                    </div>
                    {getRoute.data.steps?.slice(0, 5).map((step: any, i: number) => (
                      <div key={i} className="text-[10px] text-[rgba(235,235,245,0.5)] pl-2 border-l-2 border-[rgba(84,84,88,0.35)]">
                        {step.instruction?.replace(/<[^>]*>/g, '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePanel === "share" && (
              <div className="bg-[#1c1c1e] rounded-xl p-3 border border-[rgba(84,84,88,0.35)]">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="w-3.5 h-3.5 text-[#bf5af2]" />
                  <span className="text-[12px] font-semibold">Live Sharing</span>
                </div>
                
                {activeShare ? (
                  <div className="space-y-2">
                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <p className="text-[10px] text-[rgba(235,235,245,0.4)] mb-1">Sharing with</p>
                      <p className="text-[12px] font-medium">{activeShare.recipientId}</p>
                      <div className="flex items-center gap-1 mt-2 text-[#bf5af2]">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px]">Active</span>
                      </div>
                    </div>
                    <button
                      onClick={() => stopShare.mutate(activeShare.token)}
                      className="w-full py-2 bg-[#ff375f] text-white rounded-lg text-[12px] font-semibold"
                    >
                      Stop Sharing
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Recipient ID"
                      value={shareRecipient}
                      onChange={(e) => setShareRecipient(e.target.value)}
                      className="w-full px-3 py-2 bg-[#2c2c2e] rounded-lg text-[12px] placeholder-[rgba(235,235,245,0.25)] border border-[rgba(84,84,88,0.35)] focus:border-[#bf5af2] focus:outline-none transition-colors"
                    />
                    <select
                      value={shareDuration}
                      onChange={(e) => setShareDuration(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-[#2c2c2e] rounded-lg text-[12px] border border-[rgba(84,84,88,0.35)] focus:border-[#bf5af2] focus:outline-none transition-colors"
                    >
                      <option value={300}>5 minutes</option>
                      <option value={900}>15 minutes</option>
                      <option value={1800}>30 minutes</option>
                      <option value={3600}>1 hour</option>
                    </select>
                    <button
                      onClick={handleStartShare}
                      disabled={!shareRecipient.trim()}
                      className="w-full py-2 bg-[#bf5af2] text-white rounded-lg text-[12px] font-semibold hover:bg-[#a94de0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Start Sharing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </section>
        </div>
      </div>

      <CyrusHumanoid
        module="navigation"
        context={`User is in navigation module. ${currentPosition ? `Current position: ${currentPosition.lat.toFixed(6)}, ${currentPosition.lon.toFixed(6)}. Location: ${locationName}. Altitude: ${altitude.toFixed(1)}m. Speed: ${(speed * 3.6).toFixed(1)}km/h. Heading: ${heading.toFixed(0)}° ${getCardinalDirection(heading)}.` : "No position data"}. GPS tracking: ${isWatching ? "active" : "inactive"}.`}
        compact={true}
      />
    </div>
    </ModuleWorkspacePageShell>
  );
}
