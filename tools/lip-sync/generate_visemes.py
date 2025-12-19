#!/usr/bin/env python3
"""
Rhubarb Lip Sync Wrapper
Generates viseme timing JSON from audio files using Rhubarb Lip Sync.

Usage:
    python generate_visemes.py --audio speech.wav --output visemes.json
    python generate_visemes.py --audio speech.wav --transcript "Hello world" --output visemes.json
"""

import argparse
import json
import subprocess
import sys
import os
from pathlib import Path


def find_rhubarb() -> str:
    """Find Rhubarb executable in PATH or common locations."""
    # Check PATH
    result = subprocess.run(["which", "rhubarb"], capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout.strip()
    
    # Check common locations
    common_paths = [
        "/usr/local/bin/rhubarb",
        "/opt/homebrew/bin/rhubarb",
        os.path.expanduser("~/bin/rhubarb"),
        "./rhubarb",
    ]
    
    for path in common_paths:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    
    return None


def generate_visemes(
    audio_path: str,
    output_path: str = None,
    transcript: str = None,
    extended_shapes: bool = True,
    recognizer: str = "pocketSphinx"
) -> dict:
    """
    Generate viseme timing from audio using Rhubarb.
    
    Args:
        audio_path: Path to audio file (WAV, MP3, etc.)
        output_path: Optional path to save JSON output
        transcript: Optional transcript text for better accuracy
        extended_shapes: Whether to use extended viseme shapes (G, H, X)
        recognizer: 'pocketSphinx' (English) or 'phonetic' (any language)
    
    Returns:
        Dictionary with viseme timing data
    """
    rhubarb_path = find_rhubarb()
    if not rhubarb_path:
        raise FileNotFoundError(
            "Rhubarb Lip Sync not found. Install via:\n"
            "  macOS: brew install rhubarb-lip-sync\n"
            "  Or download from: https://github.com/DanielSWolf/rhubarb-lip-sync/releases"
        )
    
    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    # Build command
    cmd = [
        rhubarb_path,
        audio_path,
        "--exportFormat", "json",
        "--recognizer", recognizer,
    ]
    
    # Add extended shapes option
    if extended_shapes:
        cmd.extend(["--extendedShapes", "GHX"])
    else:
        cmd.extend(["--extendedShapes", ""])
    
    # Add transcript if provided
    if transcript:
        # Write transcript to temp file
        transcript_path = audio_path + ".transcript.txt"
        with open(transcript_path, "w") as f:
            f.write(transcript)
        cmd.extend(["--dialogFile", transcript_path])
    
    # Run Rhubarb
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Clean up transcript file
    if transcript:
        try:
            os.remove(transcript_path)
        except:
            pass
    
    if result.returncode != 0:
        raise RuntimeError(f"Rhubarb failed: {result.stderr}")
    
    # Parse JSON output
    data = json.loads(result.stdout)
    
    # Transform to our format
    viseme_data = transform_rhubarb_output(data)
    
    # Save if output path provided
    if output_path:
        with open(output_path, "w") as f:
            json.dump(viseme_data, f, indent=2)
        print(f"Saved visemes to: {output_path}")
    
    return viseme_data


def transform_rhubarb_output(rhubarb_data: dict) -> dict:
    """
    Transform Rhubarb JSON output to our avatar format.
    
    Rhubarb format:
    {
        "metadata": {"soundFile": "...", "duration": 1.5},
        "mouthCues": [{"start": 0.0, "end": 0.1, "value": "X"}, ...]
    }
    
    Our format:
    {
        "duration": 1.5,
        "visemes": [{"start": 0.0, "end": 0.1, "value": "X"}, ...]
    }
    """
    return {
        "duration": rhubarb_data.get("metadata", {}).get("duration", 0),
        "visemes": rhubarb_data.get("mouthCues", [])
    }


def main():
    parser = argparse.ArgumentParser(
        description="Generate viseme timing from audio using Rhubarb Lip Sync"
    )
    parser.add_argument(
        "--audio", "-a",
        required=True,
        help="Path to audio file (WAV, MP3, OGG, etc.)"
    )
    parser.add_argument(
        "--output", "-o",
        help="Path to save JSON output (prints to stdout if not specified)"
    )
    parser.add_argument(
        "--transcript", "-t",
        help="Optional transcript text for improved accuracy"
    )
    parser.add_argument(
        "--no-extended",
        action="store_true",
        help="Disable extended viseme shapes (G, H, X)"
    )
    parser.add_argument(
        "--phonetic",
        action="store_true",
        help="Use phonetic recognizer (for non-English)"
    )
    
    args = parser.parse_args()
    
    try:
        result = generate_visemes(
            audio_path=args.audio,
            output_path=args.output,
            transcript=args.transcript,
            extended_shapes=not args.no_extended,
            recognizer="phonetic" if args.phonetic else "pocketSphinx"
        )
        
        if not args.output:
            print(json.dumps(result, indent=2))
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
