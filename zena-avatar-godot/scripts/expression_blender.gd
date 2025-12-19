# Expression Blender
# Manages facial expression presets with smooth blending
extends Node
class_name ExpressionBlender

signal expression_changed(expression: String, intensity: float)

# Expression preset definitions (bone/parameter targets)
const EXPRESSIONS := {
	"neutral": {
		"brow_left_raise": 0.0,
		"brow_right_raise": 0.0,
		"brow_furrow": 0.0,
		"eye_left_squint": 0.0,
		"eye_right_squint": 0.0,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.0,
		"frown": 0.0,
		"head_tilt": 0.0,
	},
	"confident": {
		"brow_left_raise": 0.1,
		"brow_right_raise": 0.1,
		"brow_furrow": 0.0,
		"eye_left_squint": 0.1,
		"eye_right_squint": 0.1,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.4,
		"frown": 0.0,
		"head_tilt": 0.05,
	},
	"serious": {
		"brow_left_raise": 0.0,
		"brow_right_raise": 0.0,
		"brow_furrow": 0.3,
		"eye_left_squint": 0.2,
		"eye_right_squint": 0.2,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.0,
		"frown": 0.1,
		"head_tilt": 0.0,
	},
	"happy": {
		"brow_left_raise": 0.3,
		"brow_right_raise": 0.3,
		"brow_furrow": 0.0,
		"eye_left_squint": 0.2,
		"eye_right_squint": 0.2,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.8,
		"frown": 0.0,
		"head_tilt": 0.1,
	},
	"concerned": {
		"brow_left_raise": 0.2,
		"brow_right_raise": 0.0,
		"brow_furrow": 0.4,
		"eye_left_squint": 0.0,
		"eye_right_squint": 0.0,
		"eye_left_wide": 0.1,
		"eye_right_wide": 0.1,
		"smile": 0.0,
		"frown": 0.3,
		"head_tilt": -0.1,
	},
	"thinking": {
		"brow_left_raise": 0.0,
		"brow_right_raise": 0.3,
		"brow_furrow": 0.1,
		"eye_left_squint": 0.1,
		"eye_right_squint": 0.0,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.1,
		"frown": 0.0,
		"head_tilt": 0.15,
	},
	"surprised": {
		"brow_left_raise": 0.7,
		"brow_right_raise": 0.7,
		"brow_furrow": 0.0,
		"eye_left_squint": 0.0,
		"eye_right_squint": 0.0,
		"eye_left_wide": 0.6,
		"eye_right_wide": 0.6,
		"smile": 0.0,
		"frown": 0.0,
		"head_tilt": 0.0,
	},
	"focused": {
		"brow_left_raise": 0.0,
		"brow_right_raise": 0.0,
		"brow_furrow": 0.2,
		"eye_left_squint": 0.3,
		"eye_right_squint": 0.3,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.0,
		"frown": 0.0,
		"head_tilt": 0.0,
	},
	"amused": {
		"brow_left_raise": 0.4,
		"brow_right_raise": 0.1,
		"brow_furrow": 0.0,
		"eye_left_squint": 0.2,
		"eye_right_squint": 0.1,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.6,
		"frown": 0.0,
		"head_tilt": 0.1,
	},
	"empathetic": {
		"brow_left_raise": 0.2,
		"brow_right_raise": 0.2,
		"brow_furrow": 0.1,
		"eye_left_squint": 0.0,
		"eye_right_squint": 0.0,
		"eye_left_wide": 0.0,
		"eye_right_wide": 0.0,
		"smile": 0.2,
		"frown": 0.0,
		"head_tilt": 0.15,
	},
}

# Current expression state
var current_expression: String = "neutral"
var current_intensity: float = 1.0
var target_expression: String = "neutral"
var target_intensity: float = 1.0

# Blended parameter values (what actually drives the rig)
var parameter_values: Dictionary = {}
var target_parameter_values: Dictionary = {}

# Blend settings
@export var blend_speed: float = 4.0
@export var micro_expression_intensity: float = 0.1

# Beat system for animation events
var active_beats: Array = []  # [{time: float, action: String, amount: float, processed: bool}]
var beat_time: float = 0.0


func _ready() -> void:
	# Initialize parameter values from neutral
	_initialize_parameters()


func _process(delta: float) -> void:
	# Process beats
	_update_beats(delta)
	
	# Blend parameters towards targets
	for param in parameter_values:
		if target_parameter_values.has(param):
			parameter_values[param] = lerpf(
				parameter_values[param], 
				target_parameter_values[param], 
				blend_speed * delta
			)


func _initialize_parameters() -> void:
	"""Initialize all parameters to neutral values."""
	for param in EXPRESSIONS["neutral"]:
		parameter_values[param] = EXPRESSIONS["neutral"][param]
		target_parameter_values[param] = EXPRESSIONS["neutral"][param]


func set_expression(expression_name: String, intensity: float = 1.0) -> void:
	"""Set target expression with intensity (0-1)."""
	if not EXPRESSIONS.has(expression_name):
		push_warning("Unknown expression: " + expression_name)
		return
	
	target_expression = expression_name
	target_intensity = clampf(intensity, 0.0, 1.0)
	
	# Calculate blended target values
	_calculate_target_values()
	
	expression_changed.emit(expression_name, intensity)


func blend_expressions(expr_a: String, expr_b: String, blend_factor: float, intensity: float = 1.0) -> void:
	"""Blend between two expressions. blend_factor 0 = expr_a, 1 = expr_b."""
	if not EXPRESSIONS.has(expr_a) or not EXPRESSIONS.has(expr_b):
		push_warning("Unknown expression in blend")
		return
	
	blend_factor = clampf(blend_factor, 0.0, 1.0)
	intensity = clampf(intensity, 0.0, 1.0)
	
	var preset_a: Dictionary = EXPRESSIONS[expr_a]
	var preset_b: Dictionary = EXPRESSIONS[expr_b]
	
	for param in preset_a:
		var value_a: float = preset_a[param]
		var value_b: float = preset_b.get(param, value_a)
		target_parameter_values[param] = lerpf(value_a, value_b, blend_factor) * intensity


func _calculate_target_values() -> void:
	"""Calculate target parameter values from current expression preset."""
	var preset: Dictionary = EXPRESSIONS.get(target_expression, EXPRESSIONS["neutral"])
	var neutral: Dictionary = EXPRESSIONS["neutral"]
	
	for param in neutral:
		var preset_value: float = preset.get(param, neutral[param])
		# Blend between neutral and preset based on intensity
		target_parameter_values[param] = lerpf(neutral[param], preset_value, target_intensity)


func get_parameter(param_name: String) -> float:
	"""Get current interpolated value for a parameter."""
	return parameter_values.get(param_name, 0.0)


func get_all_parameters() -> Dictionary:
	"""Get all current parameter values."""
	return parameter_values.duplicate()


func add_parameter_offset(param_name: String, offset: float) -> void:
	"""Add a temporary offset to a parameter (for beats/micro-expressions)."""
	if target_parameter_values.has(param_name):
		target_parameter_values[param_name] = clampf(
			target_parameter_values[param_name] + offset, -1.0, 1.0
		)


func apply_micro_expression() -> void:
	"""Apply subtle random variations for natural feel."""
	var params := ["brow_left_raise", "brow_right_raise", "eye_left_squint", "eye_right_squint"]
	for param in params:
		if parameter_values.has(param):
			var noise := (randf() - 0.5) * micro_expression_intensity
			add_parameter_offset(param, noise)


# === Beat System ===

func load_beats(beats: Array) -> void:
	"""Load animation beats from LLM-generated data.
	Format: [{"t": 0.3, "action": "browRaise", "amount": 0.4}, ...]
	"""
	active_beats = []
	for beat in beats:
		active_beats.append({
			"time": beat.get("t", 0.0),
			"action": beat.get("action", ""),
			"amount": beat.get("amount", 0.0),
			"processed": false
		})
	beat_time = 0.0


func start_beats() -> void:
	"""Start processing beats from the beginning."""
	beat_time = 0.0
	for beat in active_beats:
		beat["processed"] = false


func _update_beats(delta: float) -> void:
	if active_beats.is_empty():
		return
	
	beat_time += delta
	
	for beat in active_beats:
		if beat["processed"]:
			continue
		if beat_time >= beat["time"]:
			_process_beat(beat)
			beat["processed"] = true


func _process_beat(beat: Dictionary) -> void:
	"""Process a single animation beat."""
	var action: String = beat.get("action", "")
	var amount: float = beat.get("amount", 0.0)
	
	match action:
		"browRaise":
			add_parameter_offset("brow_left_raise", amount)
			add_parameter_offset("brow_right_raise", amount)
		"browFurrow":
			add_parameter_offset("brow_furrow", amount)
		"smile":
			add_parameter_offset("smile", amount)
		"frown":
			add_parameter_offset("frown", amount)
		"eyeWiden":
			add_parameter_offset("eye_left_wide", amount)
			add_parameter_offset("eye_right_wide", amount)
		"eyeNarrow":
			add_parameter_offset("eye_left_squint", amount)
			add_parameter_offset("eye_right_squint", amount)
		"headTilt":
			add_parameter_offset("head_tilt", amount)
		"headNod":
			# Head nod would be handled differently (position animation)
			pass
		"blink":
			# Blink is handled by IdleBehaviors
			pass


func reset_to_neutral() -> void:
	"""Reset all parameters to neutral."""
	target_expression = "neutral"
	target_intensity = 1.0
	_calculate_target_values()
	active_beats.clear()
