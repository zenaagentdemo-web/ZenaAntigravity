# Viseme Controller
# Manages mouth shape animation based on viseme data or amplitude
extends Node
class_name VisemeController

signal viseme_changed(viseme: String)

# Standard Rhubarb viseme set
enum Viseme { X, A, B, C, D, E, F, G, H }

const VISEME_NAMES := ["X", "A", "B", "C", "D", "E", "F", "G", "H"]

# Viseme descriptions for reference:
# X = Rest/Idle (closed, relaxed)
# A = P, B, M (closed with pressure)
# B = K, S, T, EE (slightly open, teeth visible)
# C = EH, AE (open)
# D = AA (wide open)
# E = AO, ER (slightly rounded)
# F = UW, OW, W (puckered)
# G = F, V (teeth on lip)
# H = L (tongue raised)

# Current viseme weights (0-1 for each)
var viseme_weights: Array[float] = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
var target_weights: Array[float] = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

# Smoothing parameters
@export var blend_speed: float = 12.0
@export var coarticulation_lookahead: float = 0.05  # seconds

# Viseme timeline (from pre-processed data)
var viseme_timeline: Array = []  # [{start: float, end: float, value: String}]
var timeline_index: int = 0
var timeline_playing: bool = false
var timeline_time: float = 0.0

# Amplitude fallback
var amplitude_mode: bool = false
var current_amplitude: float = 0.0
var smoothed_amplitude: float = 0.0
@export var amplitude_smoothing: float = 8.0


func _ready() -> void:
	# Initialize with rest viseme
	set_viseme("X")


func _process(delta: float) -> void:
	# Update timeline playback
	if timeline_playing:
		_update_timeline(delta)
	
	# Update amplitude mode
	if amplitude_mode:
		_update_amplitude_viseme(delta)
	
	# Smooth blend towards target weights
	for i in range(viseme_weights.size()):
		viseme_weights[i] = lerpf(viseme_weights[i], target_weights[i], blend_speed * delta)


func set_viseme(viseme_name: String, weight: float = 1.0) -> void:
	"""Set a single viseme with full weight, others to zero."""
	var idx := VISEME_NAMES.find(viseme_name.to_upper())
	if idx == -1:
		push_warning("Unknown viseme: " + viseme_name)
		return
	
	# Reset all weights
	for i in range(target_weights.size()):
		target_weights[i] = 0.0
	
	target_weights[idx] = weight
	viseme_changed.emit(viseme_name)


func blend_visemes(weights: Dictionary) -> void:
	"""Set multiple viseme weights for blending. E.g., {"C": 0.7, "D": 0.3}"""
	# Reset all
	for i in range(target_weights.size()):
		target_weights[i] = 0.0
	
	# Apply provided weights
	for viseme_name in weights:
		var idx := VISEME_NAMES.find(viseme_name.to_upper())
		if idx != -1:
			target_weights[idx] = weights[viseme_name]


func get_viseme_weight(viseme_name: String) -> float:
	"""Get current interpolated weight for a viseme."""
	var idx := VISEME_NAMES.find(viseme_name.to_upper())
	if idx == -1:
		return 0.0
	return viseme_weights[idx]


func get_dominant_viseme() -> String:
	"""Get the viseme with highest current weight."""
	var max_weight := 0.0
	var max_idx := 0
	for i in range(viseme_weights.size()):
		if viseme_weights[i] > max_weight:
			max_weight = viseme_weights[i]
			max_idx = i
	return VISEME_NAMES[max_idx]


func get_mouth_openness() -> float:
	"""Calculate overall mouth openness from viseme weights (for simple animations)."""
	# Approximate openness: C and D are most open
	var openness := 0.0
	openness += viseme_weights[Viseme.C] * 0.6  # C = open
	openness += viseme_weights[Viseme.D] * 1.0  # D = wide open
	openness += viseme_weights[Viseme.E] * 0.4  # E = slightly rounded
	openness += viseme_weights[Viseme.B] * 0.3  # B = slightly open
	openness += viseme_weights[Viseme.H] * 0.5  # H = L sound
	return clampf(openness, 0.0, 1.0)


func get_mouth_roundness() -> float:
	"""Calculate mouth roundness/pucker from viseme weights."""
	var roundness := 0.0
	roundness += viseme_weights[Viseme.F] * 1.0  # F = puckered
	roundness += viseme_weights[Viseme.E] * 0.5  # E = rounded
	return clampf(roundness, 0.0, 1.0)


# === Timeline Playback ===

func load_viseme_timeline(data: Array) -> void:
	"""Load viseme timeline from JSON data.
	Expected format: [{"start": 0.0, "end": 0.1, "value": "X"}, ...]
	"""
	viseme_timeline = data
	timeline_index = 0
	timeline_time = 0.0


func play_timeline() -> void:
	"""Start playing the loaded viseme timeline."""
	timeline_playing = true
	timeline_time = 0.0
	timeline_index = 0
	amplitude_mode = false


func stop_timeline() -> void:
	"""Stop timeline playback and return to rest."""
	timeline_playing = false
	set_viseme("X")


func is_timeline_playing() -> bool:
	return timeline_playing


func _update_timeline(delta: float) -> void:
	timeline_time += delta
	
	# Find current viseme in timeline
	while timeline_index < viseme_timeline.size():
		var cue = viseme_timeline[timeline_index]
		var cue_end: float = cue.get("end", 0.0)
		
		if timeline_time < cue_end:
			# Still in this cue
			var cue_value: String = cue.get("value", "X")
			
			# Check for coarticulation with next cue
			if timeline_index + 1 < viseme_timeline.size():
				var next_cue = viseme_timeline[timeline_index + 1]
				var time_to_next: float = next_cue.get("start", 0.0) - timeline_time
				if time_to_next < coarticulation_lookahead:
					# Blend towards next viseme
					var blend_factor := 1.0 - (time_to_next / coarticulation_lookahead)
					blend_visemes({
						cue_value: 1.0 - blend_factor * 0.5,
						next_cue.get("value", "X"): blend_factor * 0.5
					})
				else:
					set_viseme(cue_value)
			else:
				set_viseme(cue_value)
			break
		else:
			# Move to next cue
			timeline_index += 1
	
	# Check if timeline finished
	if timeline_index >= viseme_timeline.size():
		stop_timeline()


# === Amplitude Mode ===

func enable_amplitude_mode() -> void:
	"""Switch to amplitude-based lip sync (fallback mode)."""
	amplitude_mode = true
	timeline_playing = false


func disable_amplitude_mode() -> void:
	"""Disable amplitude mode."""
	amplitude_mode = false
	set_viseme("X")


func set_amplitude(value: float) -> void:
	"""Set current audio amplitude (0-1) for fallback lip sync."""
	current_amplitude = clampf(value, 0.0, 1.0)


func _update_amplitude_viseme(delta: float) -> void:
	# Smooth the amplitude
	smoothed_amplitude = lerpf(smoothed_amplitude, current_amplitude, amplitude_smoothing * delta)
	
	# Add micro-variation for natural feel
	var noise := (randf() - 0.5) * 0.1
	var adjusted := clampf(smoothed_amplitude + noise, 0.0, 1.0)
	
	# Map amplitude to viseme blend
	if adjusted < 0.1:
		set_viseme("X")  # Rest
	elif adjusted < 0.3:
		blend_visemes({"A": 0.7, "B": 0.3})  # Barely open
	elif adjusted < 0.5:
		blend_visemes({"B": 0.5, "C": 0.5})  # Slightly open
	elif adjusted < 0.7:
		blend_visemes({"C": 0.6, "D": 0.4})  # Open
	else:
		blend_visemes({"D": 0.7, "E": 0.3})  # Wide open


func reset_to_rest() -> void:
	"""Reset to rest position."""
	amplitude_mode = false
	timeline_playing = false
	set_viseme("X")
