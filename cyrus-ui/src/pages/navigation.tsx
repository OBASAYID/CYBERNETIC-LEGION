import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NavigationMapView } from "@/components/map-view";
import { useNavigationPage } from "@/hooks/useNavigationPage";

export default function Navigation() {
  const {
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
  } = useNavigationPage();

  return (
    <div className="min-h-screen bg-transparent text-white p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Navigation</h1>
        <NavigationMapView
          center={fix ? { lat: fix.lat, lon: fix.lon } : null}
          accuracy={fix?.accuracy}
          polyline={route?.polyline}
          height={400}
        />
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Current Fix</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button size="sm" onClick={fetchFix}>Refresh Fix</Button>
              <Button size="sm" variant="outline" onClick={startGps}>Enable GPS</Button>
              <Button size="sm" variant="ghost" onClick={stopGps}>Stop GPS</Button>
            </div>
            {fix ? (
              <div className="text-sm text-slate-200 space-y-1">
                <div>Lat/Lon: {fix.lat.toFixed(5)}, {fix.lon.toFixed(5)}</div>
                <div>Accuracy: {fix.accuracy} m</div>
                <div>Source: {fix.source}</div>
                <div>Confidence: {(fix.confidence*100).toFixed(1)}%</div>
                <div>Age: {(fix.ageMs/1000).toFixed(1)}s</div>
              </div>
            ) : <div className="text-sm text-slate-400">No fix</div>}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Manual Fix / Destination</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Lat,Lon</Label>
              <Input value={dest} onChange={(e) => setDest(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={setManualFix}>Set Manual Fix</Button>
              <Button onClick={requestRoute} variant="outline">Route from current</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Route</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {route ? (
              <div className="text-sm text-slate-200 space-y-1">
                <div>Provider: {route.provider}</div>
                <div>Distance: {(route.distanceMeters/1000).toFixed(1)} km</div>
                <div>ETA: {(route.durationSeconds/60).toFixed(1)} min</div>
                <div>Confidence: {(route.confidence*100).toFixed(1)}%</div>
                <div>Fetched: {new Date(route.fetchedAt).toLocaleTimeString()}</div>
              </div>
            ) : <div className="text-sm text-slate-400">No route yet</div>}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle>Location Sharing</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button onClick={startShare}>Start Share (10m)</Button>
              <Button onClick={stopShare} variant="outline" disabled={!shareToken}>Stop Share</Button>
            </div>
            <div className="text-xs text-slate-400">Token: {shareToken || "-"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

