import { Check, Sparkles, X } from "lucide-react";

export function SystemStatusModal({
  show,
  isLoadingStatus,
  aiBranches,
  domainInfo,
  cyrusStatus,
  isUpgrading,
  upgradePhase,
  upgradeProgress,
  upgradeComplete,
  onClose,
  onUpgrade,
}: {
  show: boolean;
  isLoadingStatus: boolean;
  aiBranches: any[];
  domainInfo: any;
  cyrusStatus: any;
  isUpgrading: boolean;
  upgradePhase: string;
  upgradeProgress: number;
  upgradeComplete: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-4xl w-full my-8 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">System Status</h2>
            <p className="text-sm text-white/50 mt-1">
              {isLoadingStatus
                ? "Loading..."
                : `${aiBranches.length} Cognitive Branches · ${domainInfo?.branchesByDomain?.length || 8} Domains`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="button-close-status"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {cyrusStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-xs text-white/50 mb-1">Branches</div>
                    <div className="text-2xl font-semibold text-white">{cyrusStatus.soul?.branches || aiBranches.length}</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-xs text-white/50 mb-1">Coherence</div>
                    <div className="text-2xl font-semibold text-white">
                      {((cyrusStatus.quantum?.coherence || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-xs text-white/50 mb-1">Qubits</div>
                    <div className="text-2xl font-semibold text-white">{cyrusStatus.quantum?.qubits || 0}</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-xs text-white/50 mb-1">Evolution</div>
                    <div className="text-2xl font-semibold text-white">{cyrusStatus.soul?.evolutionCycle || 0}</div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      System Upgrade
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                      {isUpgrading ? upgradePhase : upgradeComplete ? "Upgrade complete!" : "Enhance cognitive capabilities and neural pathways"}
                    </p>
                  </div>
                  {!isUpgrading && (
                    <button
                      onClick={onUpgrade}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 flex items-center gap-2"
                      data-testid="button-upgrade-system"
                    >
                      <Sparkles className="w-4 h-4" />
                      Upgrade Now
                    </button>
                  )}
                </div>

                {isUpgrading && (
                  <div className="space-y-3">
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                        style={{ width: `${upgradeProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">{upgradePhase}</span>
                      <span className="text-white font-medium">{upgradeProgress}%</span>
                    </div>
                  </div>
                )}

                {upgradeComplete && !isUpgrading && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">All systems upgraded successfully</span>
                  </div>
                )}
              </div>

              {domainInfo?.branchesByDomain && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white/70">Cognitive Domains</h3>
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {domainInfo.branchesByDomain.map((domain: any) => (
                      <div key={domain.domain} className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                            <span className="font-medium text-white">{domain.domain}</span>
                          </div>
                          <span className="text-sm text-white/50">{domain.count} branches</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {domain.branches?.slice(0, 6).map((branch: any) => (
                            <span key={branch.id} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70">
                              {branch.name}
                            </span>
                          ))}
                          {domain.branches?.length > 6 && (
                            <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/40">
                              +{domain.branches.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

