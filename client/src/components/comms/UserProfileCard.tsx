import {
  X,
  MessageSquare,
  Phone,
  Video,
  MapPin,
  Star,
  UserPlus,
  UserMinus,
  Circle,
} from "lucide-react";

interface UserProfileCardProps {
  user: {
    id: string;
    displayName: string;
    isOnline: boolean;
    inCall: boolean;
    lastSeen: string | null;
  };
  isContact: boolean;
  isFavorite: boolean;
  onClose: () => void;
  onMessage: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onToggleContact: () => void;
}

export function UserProfileCard({
  user,
  isContact,
  isFavorite,
  onClose,
  onMessage,
  onVoiceCall,
  onVideoCall,
  onToggleContact,
}: UserProfileCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusText = () => {
    if (user.inCall) return "In a call";
    if (user.isOnline) return "Online";
    if (user.lastSeen) {
      const date = new Date(user.lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Last seen just now";
      if (diffMins < 60) return `Last seen ${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Last seen ${diffHours}h ago`;
      return `Last seen ${date.toLocaleDateString()}`;
    }
    return "Offline";
  };

  const getStatusColor = () => {
    if (user.inCall) return "text-amber-400";
    if (user.isOnline) return "text-green-400";
    return "text-gray-500";
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[10000]"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 max-w-xs w-[90%] shadow-2xl shadow-black/50 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            {isFavorite && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
            {isContact && (
              <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                Contact
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-cyan-500/30">
              {getInitials(user.displayName)}
            </div>
            <Circle
              className={`absolute bottom-0.5 right-0.5 w-4 h-4 fill-current ${getStatusColor()}`}
            />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {user.displayName}
          </h3>
          <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-5">
          <button
            onClick={onMessage}
            className="flex flex-col items-center gap-1.5 p-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl transition-colors group"
          >
            <MessageSquare className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-[10px] text-cyan-400 group-hover:text-cyan-300">
              Message
            </span>
          </button>
          <button
            onClick={onVoiceCall}
            className="flex flex-col items-center gap-1.5 p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-xl transition-colors group"
          >
            <Phone className="w-5 h-5 text-green-400 group-hover:text-green-300" />
            <span className="text-[10px] text-green-400 group-hover:text-green-300">
              Voice
            </span>
          </button>
          <button
            onClick={onVideoCall}
            className="flex flex-col items-center gap-1.5 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors group"
          >
            <Video className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
            <span className="text-[10px] text-blue-400 group-hover:text-blue-300">
              Video
            </span>
          </button>
          <button
            className="flex flex-col items-center gap-1.5 p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-colors group"
            title="Share Location"
          >
            <MapPin className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
            <span className="text-[10px] text-purple-400 group-hover:text-purple-300">
              Location
            </span>
          </button>
        </div>

        <button
          onClick={onToggleContact}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isContact
              ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400"
              : "bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400"
          }`}
        >
          {isContact ? (
            <>
              <UserMinus className="w-4 h-4" />
              Remove from Contacts
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Add to Contacts
            </>
          )}
        </button>
      </div>
    </div>
  );
}
