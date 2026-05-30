# CYRUS RTC test matrix

Manual and automated scenarios for voice/video P2P (pre-SFU). Record: time-to-media, ICE outcome, relay %, recovery actions, forensics export.

## Topology

| Scenario            | Setup                          | Pass criteria                                      |
| ------------------- | ------------------------------ | -------------------------------------------------- |
| WiFi ↔ WiFi         | Two desktops same LAN          | &lt; 5s to connected, p2p or srflx, audio continuous |
| Mobile ↔ WiFi       | Phone LTE + desktop            | Call completes; relay may dominate; no silent fail |
| Mobile ↔ Mobile     | Two phones                     | Relay usage documented; quality label ≥ Poor       |
| Different ISPs      | Remote peers, no LAN           | TURN relay selected if needed; forensics shows path |
| NAT-restricted      | CGNAT / symmetric NAT lab      | Escalation to relay or relay-only test succeeds    |

## Network impairment (lab)

| Condition        | Tool / note              | Pass criteria                                |
| ---------------- | ------------------------ | -------------------------------------------- |
| Weak bandwidth   | Throttle to ~500 kbps    | ABR drops preset; audio prioritized          |
| High latency     | 200–400 ms added RTT     | Quality label Good or Poor, not silent drop  |
| Packet loss      | 3–10% loss               | Auto ICE restart may fire; call recovers or ends cleanly |
| Loss spike       | &gt;12% sustained        | Recovery manager triggers restart; logged    |

## Functional

| Check                         | How                                           |
| ----------------------------- | --------------------------------------------- |
| Connection establishment time | Timestamp `peerConnection_attached` → `connected` in timeline |
| Reconnection speed            | Disconnect WiFi briefly; measure ICE restart  |
| Audio continuity              | No prolonged mute without track ended event   |
| Video continuity              | framesDecoded progression in stats            |
| Relay fallback success        | `relayActive` + non-zero `relayUsagePercent`  |
| Freeze recovery               | Stall hint + optional auto restart            |
| Autoplay recovery             | `remote_stream_reattach_playback_retry` in recovery log |

## Debug toggles

- `localStorage.setItem("cyrus-call-debug","1")` — overlay + structured logs  
- `cyrus-relay-only-test=1` — force relay ICE  
- `cyrus-comms-network-mode` — `low_bandwidth` | `audio_priority` | `emergency` | `degraded`  
- `cyrus-force-relay` / `cyrus-auto-relay-escalation` — set by auto-escalation path  

## Exports

Use **Download forensics** in the diagnostics overlay for a single JSON artifact (timeline, transport, recovery, codecs, quality scores).
