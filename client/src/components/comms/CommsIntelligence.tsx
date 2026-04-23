import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Cpu,
} from "lucide-react";
import {
  useUserInsights,
  useContactSuggestions,
  useAnomalyAlerts,
  useNetworkHealth,
} from "../../hooks/useCommsIntelligence";

interface CommsIntelligenceProps {
  userId: string;
  darkMode?: boolean;
}

export function CommsIntelligence({ userId, darkMode = true }: CommsIntelligenceProps) {
  const { data: insights } = useUserInsights(userId);
  const { data: suggestions } = useContactSuggestions(userId);
  const { data: anomalies } = useAnomalyAlerts(userId);
  const { data: networkHealth } = useNetworkHealth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sentimentColor = (score: number) => {
    if (score > 0.3) return "text-emerald-400";
    if (score > 0) return "text-green-400";
    if (score < -0.3) return "text-red-400";
    if (score < 0) return "text-orange-400";
    return "text-gray-400";
  };

  const sentimentBgColor = (score: number) => {
    if (score > 0.3) return "bg-emerald-500";
    if (score > 0) return "bg-green-500";
    if (score < -0.3) return "bg-red-500";
    if (score < 0) return "bg-orange-500";
    return "bg-gray-500";
  };

  const churnRiskLevel = (score: number) => {
    if (score >= 0.7) return { label: "High", color: "text-red-400", bg: "bg-red-500" };
    if (score >= 0.4) return { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500" };
    return { label: "Low", color: "text-emerald-400", bg: "bg-emerald-500" };
  };

  const profile = insights?.profile || insights;
  const communicationPatterns = profile?.communicationPatterns || {};
  const sentimentProfile = profile?.sentimentProfile || {};
  const peakHours: number[] = communicationPatterns?.peakHours || [];
  const sentimentTrend: { score: number; timestamp: string }[] = insights?.sentimentTrend || [];
  const contactSuggestionsList: { contactId: string; relevanceScore: number; reason: string; displayName?: string }[] =
    suggestions?.suggestions || suggestions || [];
  const anomalyList: { type: string; severity: string; description: string; timestamp: string }[] =
    anomalies?.anomalies || anomalies || [];
  const churnScore = parseFloat(profile?.churnRiskScore || insights?.churnRisk?.score || "0");
  const churn = churnRiskLevel(churnScore);

  const health = networkHealth || {};

  const { data: mlStatus } = useQuery({
    queryKey: ['/api/comms/intelligence/ml-status'],
    refetchInterval: 30000,
  });

  const mlAvailable = (mlStatus as any)?.mlServiceAvailable === true;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-white">Communication Intelligence</h2>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5" title={mlAvailable ? 'Python ML Service active (VADER + scikit-learn)' : 'Using TypeScript fallback engine'}>
            <Cpu className={`w-3.5 h-3.5 ${mlAvailable ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span className={`text-[10px] ${mlAvailable ? 'text-emerald-400' : 'text-gray-600'}`}>
              {mlAvailable ? 'ML Active' : 'Fallback'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <HealthCard
          label="Total Users"
          value={health.totalUsers ?? "—"}
          icon={<Users className="w-4 h-4 text-cyan-400" />}
          color="cyan"
        />
        <HealthCard
          label="Active Today"
          value={health.activeToday ?? "—"}
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          color="emerald"
        />
        <HealthCard
          label="Avg Sentiment"
          value={
            health.avgSentiment !== undefined
              ? (parseFloat(health.avgSentiment) >= 0 ? "+" : "") + parseFloat(health.avgSentiment).toFixed(2)
              : "—"
          }
          icon={<TrendingUp className="w-4 h-4 text-blue-400" />}
          color={
            health.avgSentiment !== undefined
              ? parseFloat(health.avgSentiment) >= 0
                ? "emerald"
                : "red"
              : "blue"
          }
        />
        <HealthCard
          label="Messages Today"
          value={health.messagesToday ?? "—"}
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
          color="yellow"
        />
        <HealthCard
          label="Call Success"
          value={
            health.callSuccessRate !== undefined
              ? `${Math.round(parseFloat(health.callSuccessRate) * 100)}%`
              : "—"
          }
          icon={<Shield className="w-4 h-4 text-purple-400" />}
          color="purple"
        />
      </div>

      <div className="bg-gray-950/80 border border-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
        <button
          onClick={() => toggleSection("insights")}
          className="w-full flex items-center justify-between mb-3"
        >
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            User Insights
          </h3>
          <span className="text-gray-600 text-xs">{expandedSection === "insights" ? "▲" : "▼"}</span>
        </button>
        {expandedSection !== "insights" && (
          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-500 block mb-2">Peak Hours (24h)</span>
              <div className="flex items-end gap-[2px] h-12">
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = peakHours.filter((h: number) => h === hour).length;
                  const maxCount = Math.max(...Array.from({ length: 24 }, (_, h) => peakHours.filter((ph: number) => ph === h).length), 1);
                  const height = (count / maxCount) * 100;
                  return (
                    <div
                      key={hour}
                      className="flex-1 flex flex-col items-center justify-end"
                      title={`${hour}:00 - ${count} interactions`}
                    >
                      <div
                        className="w-full rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${Math.max(height, 4)}%`,
                          background: count > 0
                            ? `linear-gradient(to top, rgb(6, 182, 212), rgb(34, 211, 238))`
                            : "rgb(31, 41, 55)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-gray-600">0h</span>
                <span className="text-[9px] text-gray-600">6h</span>
                <span className="text-[9px] text-gray-600">12h</span>
                <span className="text-[9px] text-gray-600">18h</span>
                <span className="text-[9px] text-gray-600">24h</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Preferred Channels</span>
                <span className="text-white font-medium">
                  {(communicationPatterns.preferredChannels || []).slice(0, 3).join(", ") || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Msg Frequency</span>
                <span className="text-white font-medium">
                  {communicationPatterns.messagingFrequency
                    ? `${Number(communicationPatterns.messagingFrequency).toFixed(1)}/day`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Avg Response</span>
                <span className="text-white font-medium">
                  {communicationPatterns.responseTimeMs
                    ? `${(Number(communicationPatterns.responseTimeMs) / 1000).toFixed(1)}s`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-950/80 border border-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Sentiment Trend
        </h3>
        {sentimentTrend.length > 0 ? (
          <div className="flex items-center gap-1 h-8 overflow-hidden">
            {sentimentTrend.slice(-50).map((item, idx) => {
              const score = typeof item === "object" ? item.score : parseFloat(String(item));
              return (
                <div
                  key={idx}
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${sentimentBgColor(score)}`}
                  title={`Score: ${score?.toFixed(2) || "N/A"}`}
                  style={{ opacity: 0.5 + (idx / sentimentTrend.length) * 0.5 }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs text-gray-600">No sentiment data yet</span>
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="text-gray-500">
            Avg: <span className={sentimentColor(sentimentProfile.avgSentiment || 0)}>
              {sentimentProfile.avgSentiment !== undefined
                ? Number(sentimentProfile.avgSentiment).toFixed(2)
                : "—"}
            </span>
          </span>
          <span className="text-gray-500">
            Trend: <span className="text-gray-300">{sentimentProfile.emotionalTrend || "—"}</span>
          </span>
        </div>
      </div>

      <div className="bg-gray-950/80 border border-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-emerald-400" />
          Smart Contact Suggestions
        </h3>
        {contactSuggestionsList.length > 0 ? (
          <div className="space-y-2">
            {contactSuggestionsList.slice(0, 5).map((contact, idx) => (
              <div
                key={contact.contactId || idx}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/50 border border-gray-800/30"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-xs text-white font-bold">
                  {(contact.displayName || contact.contactId || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-medium truncate">
                    {contact.displayName || contact.contactId}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{contact.reason}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                      style={{ width: `${Math.round((contact.relevanceScore || 0) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 w-8 text-right">
                    {Math.round((contact.relevanceScore || 0) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-600">No suggestions available yet</span>
        )}
      </div>

      <div className="bg-gray-950/80 border border-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Anomaly Alerts
        </h3>
        {anomalyList.length > 0 ? (
          <div className="space-y-2">
            {anomalyList.map((anomaly, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  anomaly.severity === "critical"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-yellow-500/10 border-yellow-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      anomaly.severity === "critical" ? "text-red-400" : "text-yellow-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium uppercase ${
                      anomaly.severity === "critical" ? "text-red-400" : "text-yellow-400"
                    }`}
                  >
                    {anomaly.severity || "warning"}
                  </span>
                  {anomaly.timestamp && (
                    <span className="text-[10px] text-gray-600 ml-auto">
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-300">{anomaly.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">No anomalies detected</span>
          </div>
        )}
      </div>

      <div className="bg-gray-950/80 border border-gray-800/60 rounded-xl p-4 backdrop-blur-sm">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-purple-400" />
          Churn Risk Indicator
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke="rgb(31, 41, 55)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke={churnScore >= 0.7 ? "#f87171" : churnScore >= 0.4 ? "#facc15" : "#34d399"}
                strokeWidth="3"
                strokeDasharray={`${churnScore * 97.4} 97.4`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${churn.color}`}>
                {Math.round(churnScore * 100)}%
              </span>
            </div>
          </div>
          <div>
            <div className={`text-lg font-bold ${churn.color}`}>{churn.label}</div>
            <span className="text-xs text-gray-500">
              {churnScore >= 0.7
                ? "User activity declining significantly"
                : churnScore >= 0.4
                  ? "Some decrease in engagement"
                  : "User engagement is healthy"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: "border-cyan-500/20 bg-cyan-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    yellow: "border-yellow-500/20 bg-yellow-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
    red: "border-red-500/20 bg-red-500/5",
  };

  const valueColorMap: Record<string, string> = {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
    red: "text-red-400",
  };

  return (
    <div className={`rounded-xl border p-3 backdrop-blur-sm ${colorMap[color] || colorMap.cyan}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`text-lg font-bold ${valueColorMap[color] || valueColorMap.cyan}`}>
        {value}
      </div>
    </div>
  );
}
