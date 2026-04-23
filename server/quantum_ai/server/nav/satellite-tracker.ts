import { Constellation, GNSSStatus, SatelliteInfo } from "./types";

const CONSTELLATION_CONFIG: Record<Constellation, { prnRange: [number, number]; count: number; orbitalPlanes: number }> = {
  GPS: { prnRange: [1, 32], count: 31, orbitalPlanes: 6 },
  GLONASS: { prnRange: [65, 88], count: 24, orbitalPlanes: 3 },
  Galileo: { prnRange: [201, 236], count: 30, orbitalPlanes: 3 },
  BeiDou: { prnRange: [301, 363], count: 44, orbitalPlanes: 3 },
  QZSS: { prnRange: [193, 200], count: 4, orbitalPlanes: 3 },
  SBAS: { prnRange: [120, 158], count: 6, orbitalPlanes: 1 },
};

let gnssStatus: GNSSStatus = {
  satellitesVisible: 0,
  satellitesUsed: 0,
  satellites: [],
  constellations: [],
  hdop: 99.0,
  vdop: 99.0,
  pdop: 99.0,
  fixType: "none",
  lastUpdate: 0,
};

function simulateSatelliteVisibility(
  lat: number, lon: number, timestamp: number
): SatelliteInfo[] {
  const satellites: SatelliteInfo[] = [];
  const timeAngle = (timestamp / 1000 / 86400) * 2 * Math.PI;
  const latFactor = Math.cos(lat * Math.PI / 180);

  for (const [constellation, config] of Object.entries(CONSTELLATION_CONFIG)) {
    const visibleCount = Math.floor(config.count * (0.3 + 0.4 * latFactor + 0.1 * Math.sin(timeAngle)));

    for (let i = 0; i < visibleCount; i++) {
      const prn = config.prnRange[0] + i;
      if (prn > config.prnRange[1]) break;

      const orbitalOffset = (2 * Math.PI * i) / config.orbitalPlanes;
      const elevation = Math.max(5, Math.min(90,
        45 + 35 * Math.sin(timeAngle + orbitalOffset + lat * 0.01)
      ));
      const azimuth = ((360 / visibleCount) * i + (timestamp / 1000) * 0.01 * (prn % 7)) % 360;
      const snr = Math.max(0, Math.min(50,
        elevation > 15 ? 25 + (elevation / 90) * 20 + (Math.random() * 5 - 2.5) : 10 + Math.random() * 10
      ));
      const used = snr > 20 && elevation > 10;

      satellites.push({
        prn,
        constellation: constellation as Constellation,
        elevation: Math.round(elevation * 10) / 10,
        azimuth: Math.round(azimuth * 10) / 10,
        snr: Math.round(snr * 10) / 10,
        used,
      });
    }
  }

  return satellites;
}

function calculateDOP(satellites: SatelliteInfo[]): { hdop: number; vdop: number; pdop: number } {
  const usedSats = satellites.filter(s => s.used);
  if (usedSats.length < 4) {
    return { hdop: 99.0, vdop: 99.0, pdop: 99.0 };
  }

  let sumH = 0;
  let sumV = 0;
  for (const sat of usedSats) {
    const elRad = sat.elevation * Math.PI / 180;
    sumH += Math.cos(elRad) * Math.cos(elRad);
    sumV += Math.sin(elRad) * Math.sin(elRad);
  }

  const n = usedSats.length;
  const geometryFactor = 1 + (1 / Math.max(1, n - 3));
  const hdop = Math.max(0.5, geometryFactor * Math.sqrt(1 / Math.max(0.01, sumH / n))) ;
  const vdop = Math.max(0.8, geometryFactor * Math.sqrt(1 / Math.max(0.01, sumV / n)));
  const pdop = Math.sqrt(hdop * hdop + vdop * vdop);

  return {
    hdop: Math.round(hdop * 100) / 100,
    vdop: Math.round(vdop * 100) / 100,
    pdop: Math.round(pdop * 100) / 100,
  };
}

function determineFixType(satellites: SatelliteInfo[]): GNSSStatus["fixType"] {
  const usedCount = satellites.filter(s => s.used).length;
  const constellations = new Set(satellites.filter(s => s.used).map(s => s.constellation));
  const avgSNR = satellites.filter(s => s.used).reduce((s, sat) => s + sat.snr, 0) / Math.max(1, usedCount);

  if (usedCount === 0) return "none";
  if (usedCount < 4) return "2D";
  if (constellations.size >= 3 && avgSNR > 35 && usedCount >= 12) return "RTK-fixed";
  if (constellations.size >= 2 && avgSNR > 30 && usedCount >= 8) return "DGPS";
  return "3D";
}

export function updateGNSSStatus(lat: number, lon: number): GNSSStatus {
  const now = Date.now();
  const satellites = simulateSatelliteVisibility(lat, lon, now);
  const dop = calculateDOP(satellites);
  const usedSats = satellites.filter(s => s.used);
  const constellations = [...new Set(usedSats.map(s => s.constellation))];

  gnssStatus = {
    satellitesVisible: satellites.length,
    satellitesUsed: usedSats.length,
    satellites,
    constellations,
    ...dop,
    fixType: determineFixType(satellites),
    lastUpdate: now,
  };

  return gnssStatus;
}

export function getGNSSStatus(): GNSSStatus {
  return gnssStatus;
}

export function getSatellitesByConstellation(): Record<Constellation, SatelliteInfo[]> {
  const result: Partial<Record<Constellation, SatelliteInfo[]>> = {};
  for (const sat of gnssStatus.satellites) {
    if (!result[sat.constellation]) result[sat.constellation] = [];
    result[sat.constellation]!.push(sat);
  }
  return result as Record<Constellation, SatelliteInfo[]>;
}

export function getSignalQuality(): {
  overall: number;
  byConstellation: Record<string, number>;
  recommendation: string;
} {
  const usedSats = gnssStatus.satellites.filter(s => s.used);
  if (usedSats.length === 0) {
    return { overall: 0, byConstellation: {}, recommendation: "No satellite signal. Move to open sky." };
  }

  const overall = usedSats.reduce((s, sat) => s + sat.snr, 0) / usedSats.length;
  const byConstellation: Record<string, number> = {};

  for (const constellation of gnssStatus.constellations) {
    const sats = usedSats.filter(s => s.constellation === constellation);
    byConstellation[constellation] = sats.reduce((s, sat) => s + sat.snr, 0) / sats.length;
  }

  let recommendation = "Excellent signal quality.";
  if (overall < 20) recommendation = "Weak signal. Move to open area away from buildings.";
  else if (overall < 30) recommendation = "Moderate signal. Position accuracy may be reduced.";
  else if (gnssStatus.hdop > 5) recommendation = "Poor satellite geometry. Accuracy limited.";

  return {
    overall: Math.round(overall * 10) / 10,
    byConstellation,
    recommendation,
  };
}
