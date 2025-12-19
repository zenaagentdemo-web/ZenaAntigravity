# Avatar Controller
# Main controller that coordinates all avatar subsystems
extends Node2D
class_name AvatarController

signal avatar_ready()
signal speaking_started()
signal speaking_finished()

# Child references (set in _ready or via @onready)
@onready var state_machine: AvatarStateMachine = $StateMachine
@onready var viseme_controller: VisemeController = $VisemeController
@onready var expression_blender: ExpressionBlender = $ExpressionBlender
@onready var idle_behaviors: IdleBehaviors = $IdleBehaviors
@onready var amplitude_analyzer: AmplitudeAnalyzer = $AmplitudeAnalyzer
@onready var audio_player: AudioStreamPlayer = $AudioPlayer

# Face rig references (set these from the scene)
@export var face_rig: Node2D
@export var mouth_sprite: Sprite2D
@export var eye_left_sprite: Sprite2D
@export var eye_right_sprite: Sprite2D
@export var eyelid_left_sprite: Sprite2D
@export var eyelid_right_sprite: Sprite2D
@export var brow_left_sprite: Sprite2D
@export var brow_right_sprite: Sprite2D

# Viseme sprites (if using sprite-swapping approach)
@export var viseme_sprites: Dictionary = {}  # {"X": Texture2D, "A": Texture2D, ...}

# Animation settings
@export var use_amplitude_fallback: bool = true
@export var debug_mode: bool = false

# Current animation plan
var current_plan: Dictionary = {}
var plan_start_time: float = 0.0


func _ready() -> void:
	_connect_signals()
	_connect_js_bridge()
	
	# Start in idle state
	state_machine.go_idle()
	expression_blender.set_expression("neutral")
	
	# Notify that avatar is ready
	call_deferred("_notify_ready")


func _notify_ready() -> void:
	avatar_ready.emit()
	if AvatarBridge:
		AvatarBridge.notify_ready()


func _connect_signals() -> void:
	"""Connect signals from subsystems."""
	state_machine.state_changed.connect(_on_state_changed)
	state_machine.state_entered.connect(_on_state_entered)
	
	viseme_controller.viseme_changed.connect(_on_viseme_changed)
	
	amplitude_analyzer.amplitude_updated.connect(_on_amplitude_updated)
	
	if audio_player:
		audio_player.finished.connect(_on_audio_finished)


func _connect_js_bridge() -> void:
	"""Connect to the JavaScript bridge autoload."""
	if AvatarBridge:
		AvatarBridge.state_requested.connect(_on_state_requested)
		AvatarBridge.expression_requested.connect(_on_expression_requested)
		AvatarBridge.visemes_received.connect(_on_visemes_received)
		AvatarBridge.animation_plan_received.connect(_on_animation_plan_received)
		AvatarBridge.message_received.connect(_on_bridge_message)


func _process(delta: float) -> void:
	# Update face rig based on current state
	_update_face_rig(delta)
	
	# Debug visualization
	if debug_mode:
		_debug_draw()


func _update_face_rig(delta: float) -> void:
	"""Apply all animation data to the face rig."""
	if not face_rig:
		return
	
	# Get expression parameters
	var params := expression_blender.get_all_parameters()
	
	# Get idle behavior values
	var eyelid_left := idle_behaviors.get_eyelid_left()
	var eyelid_right := idle_behaviors.get_eyelid_right()
	var eye_offset := idle_behaviors.get_eye_offset()
	var head_offset := idle_behaviors.get_head_micro_offset()
	
	# Get viseme data
	var mouth_openness := viseme_controller.get_mouth_openness()
	var mouth_roundness := viseme_controller.get_mouth_roundness()
	var current_viseme := viseme_controller.get_dominant_viseme()
	
	# Apply to rig elements
	_apply_eyelids(eyelid_left, eyelid_right, params)
	_apply_eyes(eye_offset, params)
	_apply_brows(params)
	_apply_mouth(current_viseme, mouth_openness, mouth_roundness)
	_apply_head_movement(head_offset, params)


func _apply_eyelids(left: float, right: float, params: Dictionary) -> void:
	"""Apply eyelid positions (blink + expression squint)."""
	if not eyelid_left_sprite or not eyelid_right_sprite:
		return
	
	# Combine blink with expression squint
	var squint_left: float = float(params.get("eye_left_squint", 0.0))
	var squint_right: float = float(params.get("eye_right_squint", 0.0))
	var wide_left: float = float(params.get("eye_left_wide", 0.0))
	var wide_right: float = float(params.get("eye_right_wide", 0.0))
	
	var final_left := clampf(left + squint_left - wide_left, 0.0, 1.0)
	var final_right := clampf(right + squint_right - wide_right, 0.0, 1.0)
	
	# Apply to sprites (assuming scale.y controls closure)
	eyelid_left_sprite.scale.y = lerpf(0.0, 1.0, final_left)
	eyelid_right_sprite.scale.y = lerpf(0.0, 1.0, final_right)


func _apply_eyes(offset: Vector2, params: Dictionary) -> void:
	"""Apply eye positions (saccades + look direction)."""
	if not eye_left_sprite or not eye_right_sprite:
		return
	
	# Scale offset to pixel movement (adjust multiplier as needed)
	var pixel_offset := offset * 10.0
	
	eye_left_sprite.position = Vector2.ZERO + pixel_offset
	eye_right_sprite.position = Vector2.ZERO + pixel_offset


func _apply_brows(params: Dictionary) -> void:
	"""Apply eyebrow positions from expression parameters."""
	if not brow_left_sprite or not brow_right_sprite:
		return
	
	var left_raise: float = float(params.get("brow_left_raise", 0.0))
	var right_raise: float = float(params.get("brow_right_raise", 0.0))
	var furrow: float = float(params.get("brow_furrow", 0.0))
	
	# Raise moves brows up, furrow moves them down and together
	brow_left_sprite.position.y = -left_raise * 10.0 + furrow * 3.0
	brow_left_sprite.position.x = furrow * 2.0  # Move inward when furrowed
	
	brow_right_sprite.position.y = -right_raise * 10.0 + furrow * 3.0
	brow_right_sprite.position.x = -furrow * 2.0


func _apply_mouth(viseme: String, openness: float, roundness: float) -> void:
	"""Apply mouth shape from viseme data."""
	if not mouth_sprite:
		return
	
	# If using sprite swapping
	if viseme_sprites.has(viseme):
		mouth_sprite.texture = viseme_sprites[viseme]
	else:
		# Fallback: use scale to simulate openness
		mouth_sprite.scale.y = lerpf(0.3, 1.0, openness)
		mouth_sprite.scale.x = lerpf(1.0, 0.7, roundness)
	
	# Add expression smile/frown
	var smile := expression_blender.get_parameter("smile")
	var frown := expression_blender.get_parameter("frown")
	
	# Could use rotation or shape tweaking based on smile/frown
	mouth_sprite.rotation_degrees = (smile - frown) * 5.0


func _apply_head_movement(offset: Vector2, params: Dictionary) -> void:
	"""Apply subtle head movement and tilt."""
	if not face_rig:
		return
	
	var head_tilt: float = float(params.get("head_tilt", 0.0))
	
	# Apply micro movement
	face_rig.position = offset * 100.0  # Scale to pixels
	
	# Apply tilt from expression
	face_rig.rotation_degrees = head_tilt * 10.0


# === Public API ===

func set_state(state_name: String) -> void:
	"""Change avatar state by name."""
	state_machine.transition_to_by_name(state_name)


func set_expression(expression_name: String, intensity: float = 1.0) -> void:
	"""Set facial expression with intensity."""
	expression_blender.set_expression(expression_name, intensity)


func play_visemes(viseme_data: Array) -> void:
	"""Play a viseme timeline for lip sync."""
	viseme_controller.load_viseme_timeline(viseme_data)
	viseme_controller.play_timeline()


func play_audio_with_visemes(audio_stream: AudioStream, viseme_data: Array) -> void:
	"""Play audio with synchronized viseme animation."""
	if not audio_player:
		push_warning("AvatarController: No AudioPlayer node")
		return
	
	audio_player.stream = audio_stream
	viseme_controller.load_viseme_timeline(viseme_data)
	
	state_machine.start_speaking()
	audio_player.play()
	viseme_controller.play_timeline()
	
	speaking_started.emit()


func play_audio_amplitude_mode(audio_stream: AudioStream) -> void:
	"""Play audio with amplitude-based fallback lip sync."""
	if not audio_player:
		push_warning("AvatarController: No AudioPlayer node")
		return
	
	audio_player.stream = audio_stream
	
	state_machine.start_speaking()
	viseme_controller.enable_amplitude_mode()
	audio_player.play()
	
	speaking_started.emit()


func play_animation_plan(plan: Dictionary) -> void:
	"""Play a full animation plan from LLM."""
	current_plan = plan
	plan_start_time = 0.0
	
	# Set expression
	var emotion: String = plan.get("emotion", "neutral")
	var intensity: float = plan.get("intensity", 1.0)
	expression_blender.set_expression(emotion, intensity)
	
	# Load beats
	var beats: Array = plan.get("beats", [])
	expression_blender.load_beats(beats)
	expression_blender.start_beats()
	
	# Load visemes if present
	var visemes: Array = plan.get("visemes", [])
	if not visemes.is_empty():
		play_visemes(visemes)


func stop_speaking() -> void:
	"""Stop current speech and return to idle."""
	if audio_player and audio_player.playing:
		audio_player.stop()
	
	viseme_controller.reset_to_rest()
	state_machine.go_idle()
	speaking_finished.emit()


func trigger_blink() -> void:
	"""Manually trigger a blink."""
	idle_behaviors.trigger_blink()


func look_towards(direction: Vector2) -> void:
	"""Direct eyes to look at a position."""
	idle_behaviors.look_at_direction(direction)


# === Signal Handlers ===

func _on_state_changed(old_state: String, new_state: String) -> void:
	idle_behaviors.adjust_for_state(new_state)
	
	if AvatarBridge:
		AvatarBridge.notify_state_changed(old_state, new_state)
	
	if debug_mode:
		print("State: %s -> %s" % [old_state, new_state])


func _on_state_entered(state: String) -> void:
	match state:
		"speaking":
			if use_amplitude_fallback and not viseme_controller.is_timeline_playing():
				viseme_controller.enable_amplitude_mode()
		"idle":
			viseme_controller.reset_to_rest()


func _on_viseme_changed(viseme: String) -> void:
	if debug_mode:
		print("Viseme: " + viseme)


func _on_amplitude_updated(value: float) -> void:
	if state_machine.is_speaking():
		viseme_controller.set_amplitude(value)
		state_machine.set_speaking_intensity(value)


func _on_audio_finished() -> void:
	stop_speaking()
	if AvatarBridge:
		AvatarBridge.notify_speaking_finished()


func _on_state_requested(state: String) -> void:
	set_state(state)


func _on_expression_requested(expression: String, intensity: float) -> void:
	set_expression(expression, intensity)


func _on_visemes_received(visemes: Array) -> void:
	play_visemes(visemes)


func _on_animation_plan_received(plan: Dictionary) -> void:
	play_animation_plan(plan)


func _on_bridge_message(data: Dictionary) -> void:
	var action: String = data.get("action", "")
	match action:
		"blink":
			trigger_blink()
		"look_at":
			look_towards(Vector2(data.get("x", 0.0), data.get("y", 0.0)))
		"set_amplitude":
			viseme_controller.set_amplitude(data.get("amplitude", 0.0))


func _debug_draw() -> void:
	"""Debug visualization (call from _draw if needed)."""
	pass
