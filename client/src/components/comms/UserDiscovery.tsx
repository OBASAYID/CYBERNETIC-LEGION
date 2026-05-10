import { useState, useMemo } from "react";
import {
  Search,
  Phone,
  Video,
  MessageSquare,
  UserPlus,
  UserMinus,
  Users,
  Circle,
  Link2,
} from "lucide-react";
import { UserProfileCard } from "./UserProfileCard";

interface OnlineUser {
  id: string;
  displayName: string;
  deviceId: string;
  inCall: boolean;
  lastActivity?: string;
}

interface Contact {
  id: string;
  userId: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  isFavorite: boolean;
  createdAt: string;
}

interface AllUser {
  id: string;
  displayName: string;
  isOnline: boolean;
  lastSeen: string | null;
  status: string;
  onlineSince?: string | null;
  lastLocation?: {
    lat: number;
    lng: number;
    accuracy?: number | null;
    at: string;
  } | null;
  locationShareEnabled?: boolean;
}

interface UserDiscoveryProps {
  onlineUsers: OnlineUser[];
  allUsers: AllUser[];
  contacts: Contact[];
  myDeviceId: string;
  onMessage: (userId: string, userName: string) => void;
  onCall: (userId: string, userName: string, type: "audio" | "video") => void;
  onAddContact: (contact: { contactId: string; contactName: string }) => void;
  onRemoveContact: (contactId: string) => void;
  /** Peers visible on /cyrus-comm-io mesh registry (often same ids as presence). */
  meshPeerIds?: Set<string>;
  meshLinkReady?: boolean;
  meshInCall?: boolean;
  onMeshCall?: (userId: string, userName: string, type: "audio" | "video") => void;
  /** Cyan glass roster inside NEXUS carousel (vs legacy gray panels). */
  nexusChrome?: boolean;
}

export function UserDiscovery({
  onlineUsers,
  allUsers,
  contacts,
  myDeviceId,
  onMessage,
  onCall,
  onAddContact,
  onRemoveContact,
  meshPeerIds,
  meshLinkReady = false,
  meshInCall = false,
  onMeshCall,
  nexusChrome = false,
}: UserDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    displayName: string;
    isOnline: boolean;
    inCall: boolean;
    lastSeen: string | null;
    onlineSince?: string | null;
    lastLocation?: AllUser["lastLocation"];
    locationShareEnabled?: boolean;
  } | null>(null);

  const contactIds = useMemo(
    () => new Set(contacts.map((c) => c.contactId)),
    [contacts]
  );

  const contactByUserId = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach((c) => map.set(c.contactId, c));
    return map;
  }, [contacts]);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers.map((u) => u.id)),
    [onlineUsers]
  );

  const filteredOnlineUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return onlineUsers.filter(
      (u) =>
        u.id !== myDeviceId &&
        (!q || u.displayName.toLowerCase().includes(q))
    );
  }, [onlineUsers, searchQuery, myDeviceId]);

  const filteredAllUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const onlineIds = new Set(onlineUsers.map((u) => u.id));
    return allUsers.filter(
      (u) =>
        u.id !== myDeviceId &&
        !onlineIds.has(u.id) &&
        (!q || u.displayName.toLowerCase().includes(q))
    );
  }, [allUsers, onlineUsers, searchQuery, myDeviceId]);

  const getStatusColor = (isOnline: boolean, inCall: boolean) => {
    if (inCall) return nexusChrome ? "text-fuchsia-400" : "text-amber-400";
    if (isOnline) return "text-green-400";
    return nexusChrome ? "text-cyan-200/35" : "text-gray-500";
  };

  const getStatusLabel = (isOnline: boolean, inCall: boolean) => {
    if (inCall) return "In Call";
    if (isOnline) return "Online";
    return "Offline";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isContact = (userId: string) => contactIds.has(userId);

  const meshReachable = (userId: string) =>
    Boolean(meshLinkReady && onMeshCall && meshPeerIds?.has(userId));

  const profileFromDirectory = (userId: string) => allUsers.find((u) => u.id === userId);

  const handleToggleContact = (userId: string, userName: string) => {
    if (isContact(userId)) {
      const contact = contactByUserId.get(userId);
      if (contact) onRemoveContact(contact.id);
    } else {
      onAddContact({ contactId: userId, contactName: userName });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className={`p-4 border-b ${
          nexusChrome ? "border-cyan-500/22 bg-cyan-950/10" : "border-gray-800/50"
        }`}
      >
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${nexusChrome ? "text-cyan-400/45" : "text-gray-500"}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name..."
            className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all ${
              nexusChrome
                ? "border border-cyan-500/25 bg-black/35 placeholder-cyan-200/25"
                : "bg-gray-800/60 border border-gray-700/50 placeholder-gray-500"
            }`}
          />
        </div>
        <p className={`mt-2 text-[10px] leading-snug ${nexusChrome ? "text-cyan-200/45" : "text-gray-500"}`}>
          GPS on the ops map appears only when a user turns on <span className="text-cyan-400/90">Live location</span> in
          Mesh (Calls tab) — coordinates are throttled and stored for the team roster.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredOnlineUsers.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <h3
                className={`text-xs font-semibold uppercase tracking-wider ${nexusChrome ? "text-cyan-200/70" : "text-gray-400"}`}
              >
                Online — {filteredOnlineUsers.length}
              </h3>
            </div>
            <div className="space-y-2">
              {filteredOnlineUsers.map((user) => (
                <div
                  key={user.id}
                  className={`group rounded-xl border p-3 transition-all cursor-pointer ${
                    nexusChrome
                      ? "border-cyan-500/20 bg-black/28 hover:border-cyan-400/40 hover:bg-cyan-950/25"
                      : "bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/30 hover:border-cyan-500/20"
                  }`}
                  onClick={() => {
                    const full = profileFromDirectory(user.id);
                    setSelectedUser({
                      id: user.id,
                      displayName: user.displayName,
                      isOnline: true,
                      inCall: user.inCall,
                      lastSeen: full?.lastSeen || user.lastActivity || null,
                      onlineSince: full?.onlineSince ?? null,
                      lastLocation: full?.lastLocation ?? null,
                      locationShareEnabled: full?.locationShareEnabled ?? false,
                    });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-cyan-500/20">
                        {getInitials(user.displayName)}
                      </div>
                      <Circle
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 fill-current ${getStatusColor(true, user.inCall)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.displayName}
                      </p>
                      <p className={`text-xs ${getStatusColor(true, user.inCall)}`}>
                        {getStatusLabel(true, user.inCall)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMessage(user.id, user.displayName);
                        }}
                        className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
                        title="Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall(user.id, user.displayName, "audio");
                        }}
                        className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                        title="Voice Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall(user.id, user.displayName, "video");
                        }}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                      {meshReachable(user.id) ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMeshCall!(user.id, user.displayName, "audio");
                            }}
                            disabled={meshInCall}
                            className="p-2 bg-violet-500/20 hover:bg-violet-500/35 text-violet-300 rounded-lg transition-colors disabled:opacity-40"
                            title="Mesh voice (WebRTC /cyrus-comm-io)"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMeshCall!(user.id, user.displayName, "video");
                            }}
                            disabled={meshInCall}
                            className="p-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/35 text-fuchsia-300 rounded-lg transition-colors disabled:opacity-40"
                            title="Mesh video (WebRTC)"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleContact(user.id, user.displayName);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          isContact(user.id)
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
                        }`}
                        title={isContact(user.id) ? "Remove Contact" : "Add Contact"}
                      >
                        {isContact(user.id) ? (
                          <UserMinus className="w-3.5 h-3.5" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className={`w-3.5 h-3.5 ${nexusChrome ? "text-cyan-400/50" : "text-gray-500"}`} />
            <h3
              className={`text-xs font-semibold uppercase tracking-wider ${nexusChrome ? "text-cyan-200/70" : "text-gray-400"}`}
            >
              All Users {filteredAllUsers.length > 0 && `— ${filteredAllUsers.length}`}
            </h3>
          </div>
          {filteredAllUsers.length === 0 && filteredOnlineUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className={`w-10 h-10 mx-auto mb-3 ${nexusChrome ? "text-cyan-700/60" : "text-gray-600"}`} />
              <p className={`text-sm ${nexusChrome ? "text-cyan-200/50" : "text-gray-500"}`}>
                {searchQuery ? "No users found matching your search" : "No other users available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAllUsers.map((user) => (
                <div
                  key={user.id}
                  className={`group rounded-xl border p-3 transition-all cursor-pointer ${
                    nexusChrome
                      ? "border-cyan-500/18 bg-black/22 hover:border-cyan-400/35 hover:bg-cyan-950/20"
                      : "bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/30 hover:border-gray-600/50"
                  }`}
                  onClick={() =>
                    setSelectedUser({
                      id: user.id,
                      displayName: user.displayName,
                      isOnline: user.isOnline || onlineUserIds.has(user.id),
                      inCall: false,
                      lastSeen: user.lastSeen,
                      onlineSince: user.onlineSince ?? null,
                      lastLocation: user.lastLocation ?? null,
                      locationShareEnabled: user.locationShareEnabled ?? false,
                    })
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          nexusChrome
                            ? "bg-gradient-to-br from-slate-700 to-cyan-900 text-cyan-100/90"
                            : "bg-gradient-to-br from-gray-600 to-gray-700 text-gray-300"
                        }`}
                      >
                        {getInitials(user.displayName)}
                      </div>
                      <Circle
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 fill-current ${getStatusColor(user.isOnline, false)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.displayName}
                      </p>
                      <p className={`text-xs ${nexusChrome ? "text-cyan-200/45" : "text-gray-500"}`}>
                        {user.isOnline
                          ? "Online"
                          : user.lastSeen
                            ? `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`
                            : "Offline"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMessage(user.id, user.displayName);
                        }}
                        className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
                        title="Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall(user.id, user.displayName, "audio");
                        }}
                        className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                        title="Voice Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCall(user.id, user.displayName, "video");
                        }}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                      {meshReachable(user.id) ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMeshCall!(user.id, user.displayName, "audio");
                            }}
                            disabled={meshInCall}
                            className="p-2 bg-violet-500/20 hover:bg-violet-500/35 text-violet-300 rounded-lg transition-colors disabled:opacity-40"
                            title="Mesh voice (WebRTC /cyrus-comm-io)"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMeshCall!(user.id, user.displayName, "video");
                            }}
                            disabled={meshInCall}
                            className="p-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/35 text-fuchsia-300 rounded-lg transition-colors disabled:opacity-40"
                            title="Mesh video (WebRTC)"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleContact(user.id, user.displayName);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          isContact(user.id)
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400"
                        }`}
                        title={isContact(user.id) ? "Remove Contact" : "Add Contact"}
                      >
                        {isContact(user.id) ? (
                          <UserMinus className="w-3.5 h-3.5" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserProfileCard
          user={selectedUser}
          isContact={isContact(selectedUser.id)}
          isFavorite={contactByUserId.get(selectedUser.id)?.isFavorite || false}
          meshReachable={meshReachable(selectedUser.id)}
          meshInCall={meshInCall}
          onClose={() => setSelectedUser(null)}
          onMessage={() => {
            onMessage(selectedUser.id, selectedUser.displayName);
            setSelectedUser(null);
          }}
          onVoiceCall={() => {
            onCall(selectedUser.id, selectedUser.displayName, "audio");
            setSelectedUser(null);
          }}
          onVideoCall={() => {
            onCall(selectedUser.id, selectedUser.displayName, "video");
            setSelectedUser(null);
          }}
          onMeshVoiceCall={
            meshReachable(selectedUser.id) && onMeshCall
              ? () => {
                  onMeshCall(selectedUser.id, selectedUser.displayName, "audio");
                  setSelectedUser(null);
                }
              : undefined
          }
          onMeshVideoCall={
            meshReachable(selectedUser.id) && onMeshCall
              ? () => {
                  onMeshCall(selectedUser.id, selectedUser.displayName, "video");
                  setSelectedUser(null);
                }
              : undefined
          }
          onToggleContact={() => {
            handleToggleContact(selectedUser.id, selectedUser.displayName);
          }}
        />
      )}
    </div>
  );
}
