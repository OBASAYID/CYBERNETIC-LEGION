import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemFetch } from '@shared/cyrus-api-client';

interface DroneState {
  connected: boolean;
  armed: boolean;
  mode: 'STABILIZE' | 'LOITER' | 'AUTO' | 'GUIDED' | 'RTL' | 'LAND';
  battery: number;
  altitude: number;
  speed: number;
  heading: number;
  latitude: number;
  longitude: number;
  satellites: number;
  signalStrength: number;
  flightTime: number;
  lastUpdate: string;
}

interface Waypoint {
  id?: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed?: number;
  holdTime?: number;
  action?: 'waypoint' | 'takeoff' | 'land' | 'rtl' | 'loiter';
}

interface Mission {
  id: string;
  name: string;
  waypoints: Waypoint[];
  status: 'pending' | 'active' | 'paused' | 'completed' | 'aborted';
  createdAt: string;
}

export function useDrone() {
  const queryClient = useQueryClient();
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const { data: stateData, isLoading: stateLoading } = useQuery<{ success: boolean; state: DroneState; simulationMode: boolean }>({
    queryKey: ['/api/drone/state'],
    queryFn: async () => {
      const res = await systemFetch('/api/drone/state');
      if (!res.ok) throw new Error('Failed to fetch drone state');
      return res.json();
    },
    refetchInterval: pollingEnabled ? 1000 : false,
  });

  const { data: missionsData, isLoading: missionsLoading } = useQuery<{ success: boolean; missions: Mission[]; activeMission: Mission | null }>({
    queryKey: ['/api/drone/missions'],
    queryFn: async () => {
      const res = await systemFetch('/api/drone/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
  });

  const connect = useMutation({
    mutationFn: async (params: { connectionType: 'wifi' | 'serial' | 'mavlink'; host?: string; port?: number }) => {
      const res = await systemFetch('/api/drone/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPollingEnabled(true);
        queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] });
      }
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await systemFetch('/api/drone/disconnect', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      setPollingEnabled(false);
      queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] });
    },
  });

  const arm = useMutation({
    mutationFn: async () => {
      const res = await systemFetch('/api/drone/arm', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const disarm = useMutation({
    mutationFn: async () => {
      const res = await systemFetch('/api/drone/disarm', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const takeoff = useMutation({
    mutationFn: async (altitude: number = 10) => {
      const res = await systemFetch('/api/drone/takeoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altitude }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const land = useMutation({
    mutationFn: async () => {
      const res = await systemFetch('/api/drone/land', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const returnToLaunch = useMutation({
    mutationFn: async () => {
      const res = await systemFetch('/api/drone/rtl', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const goTo = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number; altitude?: number }) => {
      const res = await systemFetch('/api/drone/goto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const setMode = useMutation({
    mutationFn: async (mode: DroneState['mode']) => {
      const res = await systemFetch('/api/drone/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const emergencyStop = useMutation({
    mutationFn: async () => {
      const res = await systemFetch('/api/drone/emergency', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const createMission = useMutation({
    mutationFn: async (data: { name: string; waypoints: Waypoint[] }) => {
      const res = await systemFetch('/api/drone/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/missions'] }),
  });

  const startMission = useMutation({
    mutationFn: async (missionId: string) => {
      const res = await systemFetch(`/api/drone/missions/${missionId}/start`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drone/missions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] });
    },
  });

  const abortMission = useMutation({
    mutationFn: async () => {
      const res = await systemFetch('/api/drone/missions/abort', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drone/missions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] });
    },
  });

  const navGoTo = useMutation({
    mutationFn: async (params: { latitude: number; longitude: number; altitude?: number; locationName?: string }) => {
      const res = await systemFetch('/api/drone/nav-goto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/state'] }),
  });

  const createFlightPlan = useMutation({
    mutationFn: async (data: { 
      name: string; 
      waypoints: Array<{ latitude: number; longitude: number; altitude?: number; speed?: number; holdTime?: number; action?: string }>;
      areaOfOperation?: { center: { lat: number; lng: number }; radiusMeters: number };
      areaOfInterest?: Array<{ lat: number; lng: number }>;
    }) => {
      const res = await systemFetch('/api/drone/flight-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drone/missions'] }),
  });

  const { data: navStatusData } = useQuery({
    queryKey: ['/api/drone/nav-status'],
    queryFn: async () => {
      const res = await systemFetch('/api/drone/nav-status');
      if (!res.ok) throw new Error('Failed to fetch nav status');
      return res.json();
    },
    refetchInterval: pollingEnabled ? 2000 : false,
  });

  useEffect(() => {
    if (stateData?.state?.connected) {
      setPollingEnabled(true);
    }
  }, [stateData?.state?.connected]);

  return {
    state: stateData?.state || null,
    simulationMode: stateData?.simulationMode || true,
    missions: missionsData?.missions || [],
    activeMission: missionsData?.activeMission || null,
    navStatus: navStatusData || null,
    isLoading: stateLoading || missionsLoading,
    
    connect,
    disconnect,
    arm,
    disarm,
    takeoff,
    land,
    returnToLaunch,
    goTo,
    navGoTo,
    setMode,
    emergencyStop,
    createMission,
    createFlightPlan,
    startMission,
    abortMission,
  };
}
