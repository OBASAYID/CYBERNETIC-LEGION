import { Link } from "wouter";
import { MapPin } from "lucide-react";

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

export function MobileMenuSection({
  showMenu,
  navItems,
}: {
  showMenu: boolean;
  navItems: NavItem[];
}) {
  if (!showMenu) return null;

  return (
    <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
      <div className="grid grid-cols-3 gap-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <button
              className="flex flex-col items-center gap-1 p-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          </Link>
        ))}
      </div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[11px] uppercase tracking-wider text-white/50 mb-2">Fused Module Surface</p>
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={`menu-${item.href}`} href={item.href}>
              <button className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                <item.Icon className="w-4 h-4 text-white/70" />
                <div className="min-w-0">
                  <p className="text-sm text-white">{item.label}</p>
                  {item.description && <p className="text-xs text-white/45 truncate">{item.description}</p>}
                </div>
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LocationBarSection({
  location,
  locationError,
}: {
  location: LocationData | null;
  locationError: string | null;
}) {
  if (!location || locationError) return null;

  return (
    <div className="px-6 py-2 bg-black border-b border-white/5">
      <div className="flex items-center gap-2 text-xs text-white/40">
        <MapPin className="w-3 h-3" />
        <span>
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </span>
        <span className="text-white/20">·</span>
        <span>±{location.accuracy.toFixed(0)}m</span>
      </div>
    </div>
  );
}

