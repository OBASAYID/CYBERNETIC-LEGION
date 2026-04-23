import { useState, useEffect } from "react";
import { Eye, EyeOff, User } from "lucide-react";

interface AccessGateProps {
  onAuthenticated: () => void;
}

export function AccessGate({ onAuthenticated }: AccessGateProps) {
  const [username, setUsername] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const formatted = now.toISOString().split("T")[0];
    setCurrentDate(formatted);
    
    const savedUsername = localStorage.getItem("cyrus-display-name");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleInitialize = async () => {
    if (!username.trim()) {
      setError("Username required");
      return;
    }
    if (!accessCode.trim()) {
      setError("Access code required");
      return;
    }

    setIsInitializing(true);
    setError("");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const isAdmin = username.trim() === "DELTA UNIFORM 00";
    const validAdminCode = accessCode === "71580019";
    const validUserCode = accessCode === "170392";
    
    if ((isAdmin && validAdminCode) || (!isAdmin && validUserCode)) {
      localStorage.setItem("cyrus_authenticated", "true");
      localStorage.setItem("cyrus-display-name", username.trim());
      localStorage.setItem("cyrus-user-role", isAdmin ? "admin" : "user");
      onAuthenticated();
    } else if (isAdmin && !validAdminCode) {
      setError("ACCESS DENIED - Invalid ADMIN authorization code");
      setIsInitializing(false);
    } else if (!isAdmin && !validUserCode) {
      setError("ACCESS DENIED - Invalid OPERATOR authorization code");
      setIsInitializing(false);
    } else {
      setError("ACCESS DENIED - Invalid authorization code");
      setIsInitializing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInitialize();
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/images/login-background.png?v=${Date.now()}')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />

      <div className="relative z-10 flex-1 flex flex-col px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
            <span className="text-[#30d158] text-xs font-mono tracking-widest">
              SYSTEM ACTIVE
            </span>
          </div>
          <span className="text-cyan-400/70 text-xs font-mono">{currentDate}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <div className="relative mb-8">
            <div className="w-52 h-52 relative">
              <img 
                src="/images/cyrus-logo.png" 
                alt="CYRUS" 
                className="w-full h-full object-cover drop-shadow-[0_0_30px_rgba(34,211,238,0.7)] scale-125"
                style={{ clipPath: 'circle(42% at center)' }}
              />
              <div className="absolute -left-8 top-1/2 -translate-y-1/2">
                <div className="w-12 h-14 border-l-2 border-t-2 border-b-2 border-cyan-500/70 rounded-l-lg" />
              </div>
              <div className="absolute -right-8 top-1/2 -translate-y-1/2">
                <div className="w-12 h-14 border-r-2 border-t-2 border-b-2 border-cyan-500/70 rounded-r-lg" />
              </div>
            </div>
          </div>

          <h1 className="text-7xl font-bold tracking-wider mb-4">
            <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(251,146,60,0.6)]">
              CYRUS
            </span>
            <span className="text-orange-400/80 text-2xl align-top ml-1">™</span>
          </h1>

          <p className="text-white text-base tracking-[0.3em] font-semibold mb-2 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            COMMAND YOUR RESPONSIVE
          </p>
          <p className="text-white text-base tracking-[0.3em] font-semibold mb-4 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            UNIFIED SYSTEM
          </p>

          <p className="text-orange-400 text-sm tracking-[0.2em] mb-8 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            MILITARY GRADE AI
          </p>

          <div className="w-full max-w-xs space-y-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-orange-400/10 to-orange-500/20 rounded-lg blur-sm" />
              <div className="relative bg-slate-900/80 border border-orange-500/30 rounded-lg overflow-hidden">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500/50">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="ENTER USERNAME"
                  className="w-full bg-transparent px-10 py-4 text-center text-orange-400 placeholder-orange-600/50 text-sm tracking-widest font-mono focus:outline-none uppercase"
                />
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-cyan-400/10 to-cyan-500/20 rounded-lg blur-sm" />
              <div className="relative bg-slate-900/80 border border-cyan-500/30 rounded-lg overflow-hidden">
                <input
                  type={showCode ? "text" : "password"}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ENTER ACCESS CODE"
                  className="w-full bg-transparent px-4 py-4 text-center text-cyan-400 placeholder-cyan-600/50 text-sm tracking-widest font-mono focus:outline-none"
                />
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500/50 hover:text-cyan-400 transition-colors"
                >
                  {showCode ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center font-mono">{error}</p>
            )}

            <button
              onClick={handleInitialize}
              disabled={isInitializing}
              className="w-full relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-lg blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-r from-cyan-600 to-cyan-500 py-4 rounded-lg text-white font-bold tracking-[0.3em] text-sm transition-all hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50">
                {isInitializing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    INITIALIZING...
                  </span>
                ) : (
                  "INITIALIZE"
                )}
              </div>
            </button>
          </div>

          <div className="text-center space-y-3">
            <p className="text-orange-300 text-sm tracking-[0.15em] font-mono font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              TOP SECRET // SI // ORCON // NOFORN
            </p>

            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" />
                <span className="text-sm text-white tracking-wider font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">SECURE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
                <span className="text-sm text-white tracking-wider font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">ENCRYPTED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span className="text-sm text-white tracking-wider font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">MILITARY</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pb-4">
          <p className="text-white text-sm tracking-wider font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Designed by Obakeng Kaelo - Botswana
          </p>
        </div>
      </div>
    </div>
  );
}
