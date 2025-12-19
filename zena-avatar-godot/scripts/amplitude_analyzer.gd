# Amplitude Analyzer
# Extracts audio amplitude for fallback lip sync
extends Node
class_name AmplitudeAnalyzer

signal amplitude_updated(value: float)

@export var sample_size: int = 1024
@export var smoothing_factor: float = 0.3
@export var noise_floor: float = 0.01
@export var sensitivity: float = 2.0

var audio_capture: AudioEffectCapture
var current_amplitude: float = 0.0
var smoothed_amplitude: float = 0.0
var peak_amplitude: float = 0.0

# For normalization
var amplitude_history: Array[float] = []
var history_size: int = 60  # ~1 second at 60fps


func _ready() -> void:
	_setup_audio_capture()


func _setup_audio_capture() -> void:
	"""Set up audio capture from the appropriate bus."""
	# Look for a bus named "Capture" or create effect on Master
	var bus_idx := AudioServer.get_bus_index("Capture")
	if bus_idx == -1:
		bus_idx = AudioServer.get_bus_index("Master")
	
	if bus_idx == -1:
		push_warning("AmplitudeAnalyzer: No suitable audio bus found")
		return
	
	# Check if AudioEffectCapture already exists
	for i in range(AudioServer.get_bus_effect_count(bus_idx)):
		var effect := AudioServer.get_bus_effect(bus_idx, i)
		if effect is AudioEffectCapture:
			audio_capture = effect
			return
	
	# Create new capture effect
	audio_capture = AudioEffectCapture.new()
	AudioServer.add_bus_effect(bus_idx, audio_capture)


func _process(_delta: float) -> void:
	if audio_capture == null:
		return
	
	_analyze_audio()


func _analyze_audio() -> void:
	"""Analyze captured audio and calculate amplitude."""
	var frames_available := audio_capture.get_frames_available()
	if frames_available < sample_size:
		return
	
	var buffer := audio_capture.get_buffer(sample_size)
	if buffer.is_empty():
		return
	
	# Calculate RMS (Root Mean Square) amplitude
	var sum_squares := 0.0
	for frame in buffer:
		# Stereo frame: average left and right
		var mono := (frame.x + frame.y) / 2.0
		sum_squares += mono * mono
	
	var rms := sqrt(sum_squares / buffer.size())
	
	# Apply noise floor
	if rms < noise_floor:
		rms = 0.0
	else:
		rms = (rms - noise_floor) / (1.0 - noise_floor)
	
	# Apply sensitivity
	rms *= sensitivity
	
	# Clamp to 0-1 range
	current_amplitude = clampf(rms, 0.0, 1.0)
	
	# Track peak for auto-normalization
	_update_history(current_amplitude)
	
	# Smooth the amplitude
	smoothed_amplitude = lerpf(smoothed_amplitude, current_amplitude, smoothing_factor)
	
	amplitude_updated.emit(smoothed_amplitude)


func _update_history(value: float) -> void:
	"""Update amplitude history for normalization."""
	amplitude_history.append(value)
	if amplitude_history.size() > history_size:
		amplitude_history.pop_front()
	
	# Update peak
	peak_amplitude = 0.0
	for v in amplitude_history:
		if v > peak_amplitude:
			peak_amplitude = v


func get_amplitude() -> float:
	"""Get current smoothed amplitude (0-1)."""
	return smoothed_amplitude


func get_raw_amplitude() -> float:
	"""Get current unsmoothed amplitude."""
	return current_amplitude


func get_normalized_amplitude() -> float:
	"""Get amplitude normalized to recent peak."""
	if peak_amplitude < 0.01:
		return 0.0
	return clampf(smoothed_amplitude / peak_amplitude, 0.0, 1.0)


func clear_history() -> void:
	"""Clear amplitude history (call when starting new audio)."""
	amplitude_history.clear()
	peak_amplitude = 0.0
	current_amplitude = 0.0
	smoothed_amplitude = 0.0


func set_sensitivity(value: float) -> void:
	sensitivity = clampf(value, 0.1, 10.0)


func set_smoothing(value: float) -> void:
	smoothing_factor = clampf(value, 0.0, 1.0)
