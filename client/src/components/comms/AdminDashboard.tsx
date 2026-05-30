import { useState, useEffect, useCallback } from "react";
import { systemFetch } from "@shared/cyrus-api-client";

interface AdminStats {
  activeCalls: number;
  activeConferences: number;
  onlineUsers: number;
  totalUsers: number;
  messagesToday: number;
  systemHealth: {
    socketConnections: number;
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
}

interface ActiveCallInfo {
  callId: string;
  callType: string;
  initiatorId: string;
  initiatorName: string;
  participants: string[];
  status: string;
  startedAt: string;
  callQuality: number;
  isRecording: boolean;
}

interface ConferenceInfo {
  conferenceId: string;
  title: string;
  hostId: string;
  hostName: string;
  participantCount: number;
  maxParticipants: number;
  isRecording: boolean;
  screenSharingBy: string | null;
}

interface OnlineUserInfo {
  id: string;
  displayName: string;
  email: string | null;
  profileImageUrl: string | null;
  status: string;
  lastSeen: string | null;
  socketId: string | null;
  connectionQuality: number | null;
  networkLatencyMs: number | null;
  currentCallId: string | null;
  currentConferenceId: string | null;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDuration(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getQualityColor(quality: number | null): string {
  if (quality === null || quality === undefined) return "text-gray-500";
  if (quality >= 80) return "text-emerald-400";
  if (quality >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getStatusColor(status: string): string {
  switch (status) {
    case "online": return "bg-emerald-500";
    case "busy": return "bg-red-500";
    case "away": return "bg-yellow-500";
    default: return "bg-gray-500";
  }
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [calls, setCalls] = useState<ActiveCallInfo[]>([]);
  const [conferences, setConferences] = useState<ConferenceInfo[]>([]);
  const [onlineUsersList, setOnlineUsersList] = useState<OnlineUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [messageHistory, setMessageHistory] = useState<number[]>([]);
  const [webrtcHealth, setWebrtcHealth] = useState<{
    relayConfigured?: boolean;
    iceServerCount?: number;
    iceTransportPolicy?: string;
    encodingProfile?: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, callsRes, usersRes, webrtcRes] = await Promise.all([
        systemFetch("/api/comms/admin/stats"),
        systemFetch("/api/comms/admin/active-calls"),
        systemFetch("/api/comms/admin/online-users"),
        systemFetch("/api/comms/webrtc-health"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setMessageHistory((prev) => {
          const next = [...prev, statsData.messagesToday || 0];
          return next.slice(-12);
        });
      }

      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setCalls(callsData.calls || []);
        setConferences(callsData.conferences || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setOnlineUsersList(usersData.users || []);
      }

      if (webrtcRes.ok) {
        const w = await webrtcRes.json();
        setWebrtcHealth({
          relayConfigured: w.relayConfigured,
          iceServerCount: w.iceServerCount,
          iceTransportPolicy: w.iceTransportPolicy,
          encodingProfile: w.encodingProfile,
        });
      }

      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const heapPercent = stats?.systemHealth?.memoryUsage
    ? Math.round((stats.systemHealth.memoryUsage.heapUsed / stats.systemHealth.memoryUsage.heapTotal) * 100)
    : 0;

  const maxMessageVal = Math.max(...messageHistory, 1);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          System Monitor
        </h2>
        <span className="text-xs text-gray-500">
          Last refresh: {lastRefresh.toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Active Calls"
          value={(stats?.activeCalls || 0) + (stats?.activeConferences || 0)}
          icon="📞"
          color="cyan"
        />
        <StatCard
          label="Online Users"
          value={stats?.onlineUsers || 0}
          subtitle={`/ ${stats?.totalUsers || 0} total`}
          icon="👥"
          color="emerald"
        />
        <StatCard
          label="Messages Today"
          value={stats?.messagesToday || 0}
          icon="💬"
          color="blue"
        />
        <StatCard
          label="System Health"
          value={heapPercent <= 85 ? "Healthy" : "Warning"}
          subtitle={`${heapPercent}% heap`}
          icon={heapPercent <= 85 ? "✅" : "⚠️"}
          color={heapPercent <= 85 ? "emerald" : "yellow"}
        />
      </div>

      {webrtcHealth && (
        <div className="rounded-xl border border-sky-800/40 bg-sky-950/25 px-3 py-2 text-[11px] text-sky-100/90">
          <span className="font-semibold text-sky-300">WebRTC health</span>
          <span className="mx-2 text-white/30">|</span>
          TURN relay: {webrtcHealth.relayConfigured ? "configured" : "not set (STUN-only risk)"}
          <span className="mx-2 text-white/30">·</span>
          ICE servers: {webrtcHealth.iceServerCount ?? "—"}
          <span className="mx-2 text-white/30">·</span>
          policy: {webrtcHealth.iceTransportPolicy ?? "—"}
          <span className="mx-2 text-white/30">·</span>
          profile: {webrtcHealth.encodingProfile ?? "—"}
        </div>
      )}

      <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Message Volume</h3>
        <div className="flex items-end gap-1 h-20">
          {messageHistory.length === 0 ? (
            <span className="text-xs text-gray-600">No data yet</span>
          ) : (
            messageHistory.map((val, i) => {
              const height = Math.max((val / maxMessageVal) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm min-h-[2px] transition-all duration-500"
                    style={{ height: `${height}%` }}
                    title={`${val} messages`}
                  />
                </div>
              );
            })
          )}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">Older</span>
          <span className="text-[10px] text-gray-600">Now</span>
        </div>
      </div>

      <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Active Calls ({calls.length + conferences.length})
        </h3>
        {calls.length === 0 && conferences.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-3">No active calls</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800/50">
                  <th className="text-left pb-2 pr-3 font-medium">Participants</th>
                  <th className="text-left pb-2 pr-3 font-medium">Type</th>
                  <th className="text-left pb-2 pr-3 font-medium">Duration</th>
                  <th className="text-left pb-2 pr-3 font-medium">Quality</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {calls.map((call) => (
                  <tr key={call.callId} className="text-gray-300">
                    <td className="py-2 pr-3">
                      <span className="text-white">{call.initiatorName || call.initiatorId}</span>
                      {call.participants.length > 1 && (
                        <span className="text-gray-500 ml-1">+{call.participants.length - 1}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${
                        call.callType === "video" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                      }`}>
                        {call.callType}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-400">{formatDuration(call.startedAt)}</td>
                    <td className={`py-2 pr-3 ${getQualityColor(call.callQuality)}`}>
                      {call.callQuality != null ? `${call.callQuality}%` : "—"}
                    </td>
                    <td className="py-2">
                      <span className="text-cyan-400">{call.status}</span>
                      {call.isRecording && <span className="ml-1 text-red-400">●</span>}
                    </td>
                  </tr>
                ))}
                {conferences.map((conf) => (
                  <tr key={conf.conferenceId} className="text-gray-300">
                    <td className="py-2 pr-3">
                      <span className="text-white">{conf.title || conf.hostName}</span>
                      <span className="text-gray-500 ml-1">({conf.participantCount}/{conf.maxParticipants})</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-medium bg-purple-500/20 text-purple-400">
                        conference
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-400">—</td>
                    <td className="py-2 pr-3 text-gray-500">—</td>
                    <td className="py-2">
                      <span className="text-cyan-400">active</span>
                      {conf.isRecording && <span className="ml-1 text-red-400">●</span>}
                      {conf.screenSharingBy && <span className="ml-1 text-yellow-400">📺</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Online Users ({onlineUsersList.length})
        </h3>
        {onlineUsersList.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-3">No users online</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800/50">
                  <th className="text-left pb-2 pr-3 font-medium">User</th>
                  <th className="text-left pb-2 pr-3 font-medium">Status</th>
                  <th className="text-left pb-2 pr-3 font-medium">Quality</th>
                  <th className="text-left pb-2 pr-3 font-medium">Latency</th>
                  <th className="text-left pb-2 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {onlineUsersList.map((user) => (
                  <tr key={user.id} className="text-gray-300">
                    <td className="py-2 pr-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(user.status)}`} />
                      <span className="text-white truncate max-w-[120px]">{user.displayName}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="capitalize">{user.status}</span>
                    </td>
                    <td className={`py-2 pr-3 ${getQualityColor(user.connectionQuality)}`}>
                      {user.connectionQuality != null ? `${user.connectionQuality}%` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-gray-400">
                      {user.networkLatencyMs != null ? `${user.networkLatencyMs}ms` : "—"}
                    </td>
                    <td className="py-2">
                      {user.currentCallId ? (
                        <span className="text-cyan-400">In Call</span>
                      ) : user.currentConferenceId ? (
                        <span className="text-purple-400">In Conference</span>
                      ) : (
                        <span className="text-gray-500">Idle</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-900/60 border border-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 mb-3">System Metrics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500 block">Socket Connections</span>
            <span className="text-white font-medium text-sm">
              {stats?.systemHealth?.socketConnections ?? 0}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Uptime</span>
            <span className="text-white font-medium text-sm">
              {stats?.systemHealth?.uptime ? formatUptime(stats.systemHealth.uptime) : "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Heap Used</span>
            <span className="text-white font-medium text-sm">
              {stats?.systemHealth?.memoryUsage
                ? formatBytes(stats.systemHealth.memoryUsage.heapUsed)
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">RSS Memory</span>
            <span className="text-white font-medium text-sm">
              {stats?.systemHealth?.memoryUsage
                ? formatBytes(stats.systemHealth.memoryUsage.rss)
                : "—"}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Heap Usage</span>
            <span>{heapPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                heapPercent <= 60 ? "bg-emerald-500" : heapPercent <= 85 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${heapPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "border-cyan-500/20 bg-cyan-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    yellow: "border-yellow-500/20 bg-yellow-500/5",
    red: "border-red-500/20 bg-red-500/5",
  };

  const valueColorClasses: Record<string, string> = {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className={`rounded-xl border p-3 backdrop-blur-sm ${colorClasses[color] || colorClasses.cyan}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-xl font-bold ${valueColorClasses[color] || valueColorClasses.cyan}`}>
        {value}
      </div>
      {subtitle && <span className="text-[10px] text-gray-500">{subtitle}</span>}
    </div>
  );
}
