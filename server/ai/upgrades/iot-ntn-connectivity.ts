/**
 * IoT–NTN (3GPP non-terrestrial network) connectivity profile for satellite IoT:
 * global reach, messaging, tracking, emergency services, and verticals (utilities,
 * infrastructure, maritime, agriculture, fleet telematics). Host reference: Cortex-M4F,
 * external PSRAM + flash, cellular/satellite modem, integrated RF transceiver.
 */
export type IotNtnVertical =
  | "utilities"
  | "infrastructure"
  | "maritime"
  | "agriculture"
  | "fleet-telematics"
  | "emergency";

export interface IotNtnConnectivityStatus {
  standard: "3GPP NTN";
  coverageModel: "global_satellite_overlay";
  hostMcu: "ARM Cortex-M4F";
  memory: { psramMb: number; flashMb: number };
  rf: "cellular_satellite_transceiver";
  services: {
    messaging: boolean;
    tracking: boolean;
    emergency: boolean;
  };
  /** Approximate registered endpoint-style devices (simulated fleet scale). */
  satelliteEndpoints: number;
  /** Verticals with active monitoring profiles. */
  activeVerticals: IotNtnVertical[];
  ntnRelease: string;
  lastHeartbeat: string;
}

class IotNtnConnectivityModule {
  getStatus(): IotNtnConnectivityStatus {
    return {
      standard: "3GPP NTN",
      coverageModel: "global_satellite_overlay",
      hostMcu: "ARM Cortex-M4F",
      memory: { psramMb: 8, flashMb: 16 },
      rf: "cellular_satellite_transceiver",
      services: {
        messaging: true,
        tracking: true,
        emergency: true,
      },
      satelliteEndpoints: 128_400,
      activeVerticals: [
        "utilities",
        "infrastructure",
        "maritime",
        "agriculture",
        "fleet-telematics",
        "emergency",
      ],
      ntnRelease: "Rel-17+ NTN IoT",
      lastHeartbeat: new Date().toISOString(),
    };
  }

  getStats() {
    const s = this.getStatus();
    return {
      endpoints: s.satelliteEndpoints,
      verticals: s.activeVerticals.length,
      psramMb: s.memory.psramMb,
      flashMb: s.memory.flashMb,
    };
  }
}

export const iotNtnConnectivity = new IotNtnConnectivityModule();
