# AetherOffice Local CLI Architecture

```text
User terminal
      ↓
Global AetherOffice npm executable
      ↓
Secure interactive setup (only when configuration is missing)
      ↓
Encrypted local provider vault (~/.aether-office/)
      ↓
Local Node.js backend bound to 127.0.0.1
      ↓
Local browser interface and selected workspace
```

The global npm executable is an ESM Node.js command included in the package `bin/` directory. The build also produces `dist/cli-config.js`, a runtime bridge that calls the existing provider contracts and encrypted vault rather than creating a second secret-storage path. The server bundle remains `dist/index.js`.

This separation means the npm package can be installed and started from any directory. The workspace passed to `AetherOffice` is supplied through `AETHER_WORKSPACE`; the local server uses `AETHER_LOCAL_ONLY=true` so it binds to loopback rather than a public interface.

The first-run wizard does not ask for an imaginary application-wide secret. It reads the real provider options from the application’s CLI configuration bridge, stores only the Owner-selected provider credentials through the existing AES-256-GCM vault, and requires an external provider before it treats normal setup as ready. The built-in Manus adapter is not exposed as an end-user API-key prompt because it depends on platform-supplied service credentials rather than a portable personal key.
