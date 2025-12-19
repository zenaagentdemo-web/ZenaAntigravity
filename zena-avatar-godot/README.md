# Zena Avatar Godot Project

A 2D puppet avatar system for Zena AI using Godot 4.3+.

## Prerequisites

- **Godot 4.3+**: [Download here](https://godotengine.org/download)
- **Rhubarb Lip Sync** (optional, for pre-generated visemes): `brew install rhubarb-lip-sync`

## Quick Start

### 1. Open in Godot Editor

```bash
cd zena-avatar-godot
godot --editor
```

### 2. Run Test Scene

Press F5 or click the Play button. The test scene includes keyboard controls:

| Key | Action |
|-----|--------|
| 1 | Set state: Idle |
| 2 | Set state: Listening |
| 3 | Set state: Thinking |
| 4 | Set state: Speaking |
| E | Cycle expressions |
| B | Trigger blink |
| Space | Test viseme sequence |
| A | Test amplitude mode |
| P | Test animation plan |

### 3. Export for Web

```bash
# Ensure you have Web export templates installed
# In Godot: Editor → Manage Export Templates → Download

# Export via CLI
godot --headless --export-release "Web" export/web/index.html

# Serve locally
cd export/web
python3 -m http.server 8080
# Open http://localhost:8080
```

## Project Structure

```
zena-avatar-godot/
├── project.godot           # Project config
├── export_presets.cfg      # Web export settings
├── scenes/
│   └── test_scene.tscn     # Interactive test scene
├── scripts/
│   ├── avatar_controller.gd    # Main coordinator
│   ├── state_machine.gd        # Idle/Listen/Think/Speak states
│   ├── viseme_controller.gd    # Lip sync (timeline + amplitude)
│   ├── expression_blender.gd   # Expression presets + blending
│   ├── idle_behaviors.gd       # Blinks, saccades, micro-motion
│   ├── amplitude_analyzer.gd   # Audio RMS analysis
│   └── js_bridge.gd            # React/Web communication
├── assets/                 # Add your Zena art here
└── export/                 # Exported web build
```

## Adding Zena Art

1. Prepare layered PNG assets (see implementation plan for layer guide)
2. Replace placeholder sprites in `scenes/test_scene.tscn`
3. Optionally create viseme mouth shapes (X, A, B, C, D, E, F, G, H)

## React Integration

See `packages/frontend/src/components/ZenaAvatar/` for:
- `GodotAvatar.tsx` - React component
- `useGodotBridge.ts` - Communication hook
- `types.ts` - TypeScript definitions

Example usage:

```tsx
import { GodotAvatar, GodotAvatarHandle } from './components/ZenaAvatar';

const avatarRef = useRef<GodotAvatarHandle>(null);

<GodotAvatar
  ref={avatarRef}
  godotUrl="/godot/index.html"
  width={400}
  height={400}
  onReady={() => console.log('Avatar ready')}
/>

// Control the avatar
avatarRef.current?.setState('speaking');
avatarRef.current?.setExpression('confident', 0.8);
avatarRef.current?.playVisemes(visemeData);
```

## Lip Sync

### Pre-generated visemes (recommended)

```bash
cd tools/lip-sync
python generate_visemes.py --audio speech.wav --output visemes.json
```

### Real-time amplitude (fallback)

The avatar automatically uses amplitude-based lip sync when no viseme data is provided.

## Animation Plan JSON

LLM can generate animation cues:

```json
{
  "emotion": "confident",
  "intensity": 0.8,
  "beats": [
    { "t": 0.3, "action": "browRaise", "amount": 0.4 },
    { "t": 0.8, "action": "smile", "amount": 0.5 }
  ],
  "visemes": [
    { "start": 0.0, "end": 0.2, "value": "X" },
    { "start": 0.2, "end": 0.4, "value": "D" }
  ]
}
```
