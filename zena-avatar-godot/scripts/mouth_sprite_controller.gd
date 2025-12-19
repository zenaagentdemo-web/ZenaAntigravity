# Mouth Sprite Controller
# Handles viseme-based mouth animation as an overlay on expressions
extends Node
class_name MouthSpriteController

signal viseme_changed(old_viseme: String, new_viseme: String)

# Viseme textures path
const VISEME_PATH := "res://assets/visemes/"

# All viseme codes
const VISEMES := ["X", "A", "B", "C", "D", "E", "F", "G", "H"]

# Mouth sprite reference
@export var mouth_sprite: Sprite2D:
	set(value):
		mouth_sprite = value
		if mouth_sprite:
			mouth_sprite.position = mouth_offset
			mouth_sprite.scale = mouth_scale
			_set_viseme_texture(current_viseme)

# Offset from expression sprite center (adjust based on face positioning)
@export var mouth_offset: Vector2 = Vector2(0, 60)
@export var mouth_scale: Vector2 = Vector2(0.15, 0.15)

# Animation settings
@export var transition_speed: float = 15.0  # How fast to blend between visemes
@export var amplitude_sensitivity: float = 1.5

# Shader settings
@export var shader_feather: float = 0.2
@export var shader_radial_scale: float = 1.1
@export var shader_offset: Vector2 = Vector2(0.0, 0.05)

# Current state
var current_viseme: String = "X"
var target_viseme: String = "X"
var viseme_textures: Dictionary = {}
var is_speaking: bool = false

# Amplitude-based fallback
var current_amplitude: float = 0.0


func _ready() -> void:
	_preload_visemes()
	if mouth_sprite:
		mouth_sprite.position = mouth_offset
		mouth_sprite.scale = mouth_scale
		
		# Set up shader material
		var mat := ShaderMaterial.new()
		mat.shader = load("res://shaders/mouth_shaper.gdshader")
		mouth_sprite.material = mat
		_update_shader_params()
		
		_set_viseme_texture(current_viseme)


func _update_shader_params() -> void:
	if mouth_sprite and mouth_sprite.material is ShaderMaterial:
		var mat := mouth_sprite.material as ShaderMaterial
		mat.set_shader_parameter("feather_amount", shader_feather)
		mat.set_shader_parameter("radial_scale", shader_radial_scale)
		mat.set_shader_parameter("offset", shader_offset)


func _preload_visemes() -> void:
	"""Load all viseme textures into memory."""
	for v in VISEMES:
		var path: String = VISEME_PATH + "viseme-" + v + ".png"
		var texture = load(path)
		
		if texture is Texture2D:
			viseme_textures[v] = texture
		else:
			push_warning("Failed to load viseme: " + path)
	
	print("Mouth Controller: Loaded ", viseme_textures.size(), " visemes")


func set_viseme(viseme_code: String) -> void:
	"""Set the current viseme by code (X, A, B, C, D, E, F, G, H)."""
	if viseme_code not in VISEMES:
		push_warning("Unknown viseme code: " + viseme_code)
		return
	
	if viseme_code != current_viseme:
		var old: String = current_viseme
		current_viseme = viseme_code
		target_viseme = viseme_code
		_set_viseme_texture(viseme_code)
		viseme_changed.emit(old, viseme_code)


func set_amplitude(amplitude: float) -> void:
	"""Set mouth openness based on audio amplitude (0.0-1.0)."""
	current_amplitude = clampf(amplitude * amplitude_sensitivity, 0.0, 1.0)
	
	# Map amplitude to viseme
	var viseme: String = _amplitude_to_viseme(current_amplitude)
	if viseme != target_viseme:
		target_viseme = viseme
		set_viseme(viseme)


func _amplitude_to_viseme(amp: float) -> String:
	"""Map amplitude value to appropriate viseme."""
	if amp < 0.1:
		return "X"  # Closed
	elif amp < 0.25:
		return "A"  # Lips together
	elif amp < 0.4:
		return "B"  # Slightly open
	elif amp < 0.55:
		return "C"  # Open
	elif amp < 0.7:
		return "E"  # Rounded
	elif amp < 0.85:
		return "D"  # Wide open
	else:
		return "D"  # Maximum open


func _set_viseme_texture(viseme_code: String) -> void:
	"""Apply viseme texture to mouth sprite."""
	if not mouth_sprite:
		return
	
	if viseme_textures.has(viseme_code):
		mouth_sprite.texture = viseme_textures[viseme_code]
		mouth_sprite.modulate = Color.WHITE # Ensure visible
	else:
		# Fallback indicator for missing textures
		mouth_sprite.texture = null
		# If we have no texture, the sprite is invisible.
		# Let's print for debugging.
		if is_speaking:
			print("MISSING VIS-TEXTURE: ", viseme_code)


func start_speaking() -> void:
	"""Enable speaking mode - mouth becomes visible."""
	is_speaking = true
	if mouth_sprite:
		mouth_sprite.visible = true


func stop_speaking() -> void:
	"""Disable speaking mode - return to rest."""
	is_speaking = false
	set_viseme("X")
	if mouth_sprite:
		# Keep visible but at rest position
		mouth_sprite.visible = true


func hide_mouth() -> void:
	"""Hide the mouth overlay completely."""
	if mouth_sprite:
		mouth_sprite.visible = false


func show_mouth() -> void:
	"""Show the mouth overlay."""
	if mouth_sprite:
		mouth_sprite.visible = true


func get_current_viseme() -> String:
	return current_viseme


func set_mouth_position(offset: Vector2) -> void:
	"""Adjust mouth position offset."""
	mouth_offset = offset
	if mouth_sprite:
		mouth_sprite.position = offset


func set_mouth_scale(new_scale: Vector2) -> void:
	"""Adjust mouth scale."""
	mouth_scale = new_scale
	if mouth_sprite:
		mouth_sprite.scale = new_scale
