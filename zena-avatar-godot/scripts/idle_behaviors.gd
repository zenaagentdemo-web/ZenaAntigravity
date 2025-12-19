# Idle Behaviors
# Handles automatic blinking, eye saccades, micro head movements
extends Node
class_name IdleBehaviors

signal blink_started()
signal blink_ended()
signal saccade_performed(direction: Vector2)

# Blink settings
@export var blink_interval_min: float = 2.0
@export var blink_interval_max: float = 5.0
@export var blink_duration: float = 0.15
@export var double_blink_chance: float = 0.2

# Saccade settings (subtle eye movements)
@export var saccade_interval_min: float = 0.5
@export var saccade_interval_max: float = 2.0
@export var saccade_range: float = 0.1  # Normalized range

# Micro movement settings
@export var micro_move_intensity: float = 0.02
@export var micro_move_speed: float = 0.5

# State tracking
var is_blinking: bool = false
var blink_progress: float = 0.0
var time_until_blink: float = 0.0
var time_until_saccade: float = 0.0

# Eye position
var base_eye_position: Vector2 = Vector2.ZERO
var current_eye_offset: Vector2 = Vector2.ZERO
var target_eye_offset: Vector2 = Vector2.ZERO

# Eyelid values (0 = open, 1 = closed)
var eyelid_left: float = 0.0
var eyelid_right: float = 0.0

# Micro movement noise
var noise_time: float = 0.0
var head_micro_offset: Vector2 = Vector2.ZERO

# Behavior control
var enabled: bool = true
var suppress_blink: bool = false  # Suppress during speaking intense moments


func _ready() -> void:
	_schedule_next_blink()
	_schedule_next_saccade()


func _process(delta: float) -> void:
	if not enabled:
		return
	
	# Update blink
	_update_blink(delta)
	
	# Update saccade
	_update_saccade(delta)
	
	# Update micro movements
	_update_micro_movements(delta)


func _update_blink(delta: float) -> void:
	if is_blinking:
		blink_progress += delta / blink_duration
		
		# Eyelid animation curve (quick close, slower open)
		if blink_progress < 0.4:
			# Closing
			var t := blink_progress / 0.4
			eyelid_left = ease(t, 2.0)
			eyelid_right = ease(t, 2.0)
		else:
			# Opening
			var t := (blink_progress - 0.4) / 0.6
			eyelid_left = 1.0 - ease(t, 0.5)
			eyelid_right = 1.0 - ease(t, 0.5)
		
		if blink_progress >= 1.0:
			is_blinking = false
			blink_progress = 0.0
			eyelid_left = 0.0
			eyelid_right = 0.0
			blink_ended.emit()
			_schedule_next_blink()
	else:
		time_until_blink -= delta
		if time_until_blink <= 0.0 and not suppress_blink:
			_start_blink()


func _start_blink() -> void:
	is_blinking = true
	blink_progress = 0.0
	blink_started.emit()


func _schedule_next_blink() -> void:
	time_until_blink = randf_range(blink_interval_min, blink_interval_max)
	
	# Chance for double blink
	if randf() < double_blink_chance:
		time_until_blink = 0.3  # Quick follow-up blink


func trigger_blink() -> void:
	"""Manually trigger a blink."""
	if not is_blinking:
		_start_blink()


func _update_saccade(delta: float) -> void:
	# Smooth eye movement towards target
	current_eye_offset = current_eye_offset.lerp(target_eye_offset, 8.0 * delta)
	
	# Schedule next saccade
	time_until_saccade -= delta
	if time_until_saccade <= 0.0:
		_perform_saccade()


func _perform_saccade() -> void:
	# Random eye movement within range
	target_eye_offset = Vector2(
		randf_range(-saccade_range, saccade_range),
		randf_range(-saccade_range * 0.5, saccade_range * 0.5)  # Less vertical movement
	)
	
	# Occasionally return to center
	if randf() < 0.3:
		target_eye_offset = Vector2.ZERO
	
	_schedule_next_saccade()
	saccade_performed.emit(target_eye_offset)


func _schedule_next_saccade() -> void:
	time_until_saccade = randf_range(saccade_interval_min, saccade_interval_max)


func look_at_direction(direction: Vector2) -> void:
	"""Direct eyes to look in a specific direction (-1 to 1 range)."""
	target_eye_offset = direction.clampf(-1.0, 1.0) * saccade_range * 2.0


func look_center() -> void:
	"""Return eyes to center."""
	target_eye_offset = Vector2.ZERO


func _update_micro_movements(delta: float) -> void:
	noise_time += delta * micro_move_speed
	
	# Use sine waves with different frequencies for organic motion
	head_micro_offset = Vector2(
		sin(noise_time * 1.0) * 0.3 + sin(noise_time * 2.7) * 0.2,
		sin(noise_time * 0.8) * 0.2 + sin(noise_time * 1.9) * 0.15
	) * micro_move_intensity


func get_eyelid_left() -> float:
	return eyelid_left


func get_eyelid_right() -> float:
	return eyelid_right


func get_eye_offset() -> Vector2:
	return current_eye_offset


func get_head_micro_offset() -> Vector2:
	return head_micro_offset


func set_enabled(value: bool) -> void:
	enabled = value
	if not enabled:
		# Reset to neutral
		eyelid_left = 0.0
		eyelid_right = 0.0
		current_eye_offset = Vector2.ZERO
		target_eye_offset = Vector2.ZERO


func suppress_blinking(suppress: bool) -> void:
	"""Temporarily suppress blinking (e.g., during intense speech)."""
	suppress_blink = suppress


# State-dependent behavior adjustments
func adjust_for_state(state_name: String) -> void:
	"""Adjust idle behaviors based on avatar state."""
	match state_name:
		"speaking":
			# More frequent saccades, less blinking
			saccade_interval_min = 0.3
			saccade_interval_max = 1.0
			blink_interval_min = 3.0
			blink_interval_max = 6.0
		"listening":
			# Focus forward, normal blinking
			saccade_interval_min = 1.0
			saccade_interval_max = 3.0
			blink_interval_min = 2.5
			blink_interval_max = 4.5
			look_center()
		"thinking":
			# Eyes often look up-right, slower saccades
			saccade_interval_min = 1.5
			saccade_interval_max = 4.0
			blink_interval_min = 2.0
			blink_interval_max = 4.0
			look_at_direction(Vector2(0.3, -0.2))  # Up-right
		"idle":
			# Normal behavior
			saccade_interval_min = 0.5
			saccade_interval_max = 2.0
			blink_interval_min = 2.0
			blink_interval_max = 5.0
