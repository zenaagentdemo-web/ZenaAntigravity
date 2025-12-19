# Lip Sync Tools

Python utilities for generating viseme timing data from audio files.

## Requirements

- Python 3.8+
- Rhubarb Lip Sync (command-line tool)

## Installation

### 1. Install Rhubarb Lip Sync

**macOS (Homebrew):**
```bash
brew install rhubarb-lip-sync
```

**Manual download:**
Download from [GitHub Releases](https://github.com/DanielSWolf/rhubarb-lip-sync/releases) and add to PATH.

### 2. Install Python dependencies

```bash
cd tools/lip-sync
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Usage

### Basic usage
```bash
python generate_visemes.py --audio speech.wav --output visemes.json
```

### With transcript (more accurate)
```bash
python generate_visemes.py --audio speech.wav --transcript "Hello, my name is Zena" --output visemes.json
```

### For non-English audio
```bash
python generate_visemes.py --audio speech.wav --phonetic --output visemes.json
```

## Output Format

```json
{
  "duration": 2.5,
  "visemes": [
    { "start": 0.0, "end": 0.1, "value": "X" },
    { "start": 0.1, "end": 0.3, "value": "D" },
    { "start": 0.3, "end": 0.5, "value": "C" }
  ]
}
```

## Viseme Reference

| Viseme | Sound | Description |
|--------|-------|-------------|
| X | Rest | Mouth closed, relaxed |
| A | P, B, M | Closed with pressure |
| B | K, S, T, EE | Slightly open |
| C | EH, AE | Open |
| D | AA | Wide open |
| E | AO, ER | Rounded |
| F | UW, OW, W | Puckered |
| G | F, V | Teeth on lip |
| H | L | Tongue raised |

## Integration with Godot

The output JSON can be directly loaded by the Godot avatar's VisemeController:

```gdscript
var json_data = load_json("visemes.json")
viseme_controller.load_viseme_timeline(json_data.visemes)
viseme_controller.play_timeline()
```
