import { Ear, Eye, LogOut, MapPin, Menu, Settings, Volume2 } from "lucide-react";
import { Link } from "wouter";

type NavItem = {
  href: string;
  label: string;
  description?: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
};

export function LegacyDashboardHeader({
  navItems,
  logoSrc,
  isContinuousListening,
  cameraActive,
  location,
  isSpeaking,
  showMenu,
  onToggleMenu,
  onOpenSystemStatus,
  onLogout,
}: {
  navItems: NavItem[];
  logoSrc: string;
  isContinuousListening: boolean;
  cameraActive: boolean;
  location: LocationData | null;
  isSpeaking: boolean;
  showMenu: boolean;
  onToggleMenu: () => void;
  onOpenSystemStatus: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-black/95 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img src={logoSrc} alt="CYRUS" className="w-10 h-10 rounded-full" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">CYRUS</h1>
          <div className="flex items-center gap-2">
            {[
              { active: isContinuousListening, icon: Ear },
              { active: cameraActive, icon: Eye },
              { active: !!location, icon: MapPin },
            ].map((sensor, i) => (
              <div
                key={i}
                className={`flex items-center gap-1 text-xs ${
                  sensor.active ? "text-green-400" : "text-white/30"
                }`}
              >
                <sensor.icon className="w-3 h-3" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1 max-w-[62vw] overflow-x-auto">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {isSpeaking && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
            <Volume2 className="w-4 h-4 text-white animate-pulse" />
            <span className="text-xs text-white/70">Speaking</span>
          </div>
        )}

        <button
          onClick={onOpenSystemStatus}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="button-system-status"
        >
          <Settings className="w-5 h-5 text-white/50 hover:text-white" />
        </button>

        <button
          onClick={onToggleMenu}
          className="md:hidden p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="button-mobile-menu"
          aria-pressed={showMenu}
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={onLogout}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 text-white/50 hover:text-white" />
        </button>
      </div>
    </header>
  );
}

