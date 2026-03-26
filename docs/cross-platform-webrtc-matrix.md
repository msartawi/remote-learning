# Cross-Platform WebRTC Support Matrix

Last updated: 2026-03-13

## Packaging decision path

- Desktop MVP: **Electron** first for predictable WebRTC and device permission behavior.
- Desktop alternative: **Tauri** only after explicit validation of camera/mic/screen-share and Jitsi iframe constraints.
- Mobile MVP: **React Native + react-native-webrtc** with a native SFU/Jitsi integration track.

## Capability matrix

| Capability | Web (Chrome/Edge) | Web (Safari) | Electron | Tauri (WebView) | React Native |
|---|---|---|---|---|---|
| Camera / mic | Supported | Supported (policy-sensitive) | Supported | Validate per OS/webview | Supported |
| Screen share | Supported | Supported with UX limits | Supported | Validate API parity | Partial / native-specific |
| Jitsi external API embed | Supported | Supported | Supported | Validate iframe/webview behavior | Not primary path |
| Insertable Streams (A/V E2EE) | Good support | Limited | Chromium-dependent support | Depends on embedded engine | Native pipeline (different approach) |
| Data channel chat/whiteboard | Supported | Supported | Supported | Validate reliability | Supported |
| Background behavior | Browser-dependent | Browser-dependent | Good control | App/webview-dependent | Requires native handling |
| Push notifications | Web Push | Web Push limits | OS notifications | OS notifications | Native push stack |

## Minimum test checklist before release

1. Join/leave stability for 30-minute session.
2. Camera/mic permission recovery after deny-then-allow.
3. Screen-share start/stop reliability and presenter handoff.
4. Session reconnect after network interruption.
5. Chat/whiteboard event delivery under packet loss simulation.

## Recommendation

- Keep production desktop target on Electron until Tauri parity is proven.
- Treat Safari and mobile as explicit compatibility tiers with feature fallbacks for advanced E2EE media paths.
