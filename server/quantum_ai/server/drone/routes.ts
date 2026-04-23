import type { Express } from "express";
import { droneController } from "../modules/drone-control";

export function registerDroneRoutes(app: Express) {
  // Get drone state/telemetry
  app.get("/api/drone/state", async (_req, res) => {
    try {
      const state = droneController.getState();
      res.json({
        success: true,
        state,
        simulationMode: droneController.isSimulationMode()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Connect to drone
  app.post("/api/drone/connect", async (req, res) => {
    try {
      const { connectionType, host, port, baudRate } = req.body;
      const result = await droneController.connect(
        connectionType || 'wifi',
        { host, port, baudRate }
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Disconnect from drone
  app.post("/api/drone/disconnect", async (_req, res) => {
    try {
      const result = await droneController.disconnect();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Execute drone command
  app.post("/api/drone/command", async (req, res) => {
    try {
      const { type, params } = req.body;
      if (!type) {
        return res.status(400).json({ success: false, message: 'Command type required' });
      }
      const result = await droneController.executeCommand({ type, params });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Arm drone
  app.post("/api/drone/arm", async (_req, res) => {
    try {
      const result = await droneController.executeCommand({ type: 'arm' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Disarm drone
  app.post("/api/drone/disarm", async (_req, res) => {
    try {
      const result = await droneController.executeCommand({ type: 'disarm' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Takeoff
  app.post("/api/drone/takeoff", async (req, res) => {
    try {
      const { altitude } = req.body;
      const result = await droneController.executeCommand({ 
        type: 'takeoff', 
        params: { altitude: altitude || 10 } 
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Land
  app.post("/api/drone/land", async (_req, res) => {
    try {
      const result = await droneController.executeCommand({ type: 'land' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Return to Launch
  app.post("/api/drone/rtl", async (_req, res) => {
    try {
      const result = await droneController.executeCommand({ type: 'rtl' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Go to coordinates
  app.post("/api/drone/goto", async (req, res) => {
    try {
      const { latitude, longitude, altitude } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
      }
      const result = await droneController.executeCommand({ 
        type: 'goto', 
        params: { latitude, longitude, altitude } 
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Set flight mode
  app.post("/api/drone/mode", async (req, res) => {
    try {
      const { mode } = req.body;
      if (!mode) {
        return res.status(400).json({ success: false, message: 'Mode required' });
      }
      const result = await droneController.executeCommand({ 
        type: 'set_mode', 
        params: { mode } 
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Emergency stop
  app.post("/api/drone/emergency", async (_req, res) => {
    try {
      const result = await droneController.executeCommand({ type: 'emergency_stop' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get all missions
  app.get("/api/drone/missions", async (_req, res) => {
    try {
      const missions = droneController.getMissions();
      const activeMission = droneController.getActiveMission();
      res.json({ success: true, missions, activeMission });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create mission
  app.post("/api/drone/missions", async (req, res) => {
    try {
      const { name, waypoints } = req.body;
      if (!name || !waypoints || !Array.isArray(waypoints)) {
        return res.status(400).json({ success: false, message: 'Mission name and waypoints required' });
      }
      const result = await droneController.createMission(name, waypoints);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Start mission
  app.post("/api/drone/missions/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await droneController.startMission(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Abort mission
  app.post("/api/drone/missions/abort", async (_req, res) => {
    try {
      const result = await droneController.abortMission();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/drone/nav-goto", async (req, res) => {
    try {
      const { latitude, longitude, altitude, locationName } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Navigation coordinates required' });
      }
      const result = await droneController.executeCommand({ 
        type: 'goto', 
        params: { latitude, longitude, altitude: altitude || 50 } 
      });
      res.json({
        ...result,
        navigationSource: 'nav-module',
        targetLocation: locationName || 'Navigation waypoint',
        coordinates: { latitude, longitude, altitude: altitude || 50 }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/drone/flight-plan", async (req, res) => {
    try {
      const { name, waypoints, areaOfOperation, areaOfInterest } = req.body;
      if (!name || !waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
        return res.status(400).json({ success: false, message: 'Flight plan name and waypoints required' });
      }
      
      const formattedWaypoints = waypoints.map((wp: any, index: number) => ({
        id: `wp-${Date.now()}-${index}`,
        latitude: wp.latitude,
        longitude: wp.longitude,
        altitude: wp.altitude || 50,
        speed: wp.speed || 5,
        holdTime: wp.holdTime || 0,
        action: wp.action || 'waypoint',
      }));

      const result = await droneController.createMission(name, formattedWaypoints);
      res.json({
        ...result,
        flightPlan: {
          name,
          waypointCount: formattedWaypoints.length,
          waypoints: formattedWaypoints,
          areaOfOperation: areaOfOperation || null,
          areaOfInterest: areaOfInterest || null,
          estimatedFlightTime: formattedWaypoints.length * 30,
          totalDistance: calculateTotalDistance(formattedWaypoints),
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/drone/nav-status", async (_req, res) => {
    try {
      const state = droneController.getState();
      const missions = droneController.getMissions();
      const activeMission = droneController.getActiveMission();
      
      res.json({
        success: true,
        dronePosition: {
          latitude: state.latitude,
          longitude: state.longitude,
          altitude: state.altitude,
          heading: state.heading,
          speed: state.speed,
        },
        flightStatus: {
          connected: state.connected,
          armed: state.armed,
          mode: state.mode,
          battery: state.battery,
          satellites: state.satellites,
          signalStrength: state.signalStrength,
          flightTime: state.flightTime,
        },
        missionStatus: {
          totalMissions: missions.length,
          activeMission: activeMission ? {
            id: activeMission.id,
            name: activeMission.name,
            status: activeMission.status,
            waypointCount: activeMission.waypoints.length,
          } : null,
        },
        simulationMode: droneController.isSimulationMode(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('[Drone Routes] Registered drone control API endpoints (with NAV integration)');
}

function calculateTotalDistance(waypoints: Array<{latitude: number; longitude: number}>): string {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const lat1 = waypoints[i-1].latitude * Math.PI / 180;
    const lat2 = waypoints[i].latitude * Math.PI / 180;
    const dLat = (waypoints[i].latitude - waypoints[i-1].latitude) * Math.PI / 180;
    const dLon = (waypoints[i].longitude - waypoints[i-1].longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    total += 6371000 * c;
  }
  if (total < 1000) return `${total.toFixed(0)}m`;
  return `${(total / 1000).toFixed(2)}km`;
}
