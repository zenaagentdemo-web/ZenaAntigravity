# Expression Sprite Manager
# Manages pre-rendered expression images as an alternative to rigged blending
# This uses Zena's existing expression library for immediate implementation
extends Node
class_name ExpressionSpriteManager

signal expression_loaded(expression_name: String)
signal expression_changed(old_expr: String, new_expr: String)

# Expression categories mapping to folder structure
const EXPRESSION_CATEGORIES := {
	"analytical": ["brow-pinch", "eyes-scanning", "focused-stare"],
	"analytical-extended": ["curious-intrigued", "pondering"],
	"confident": ["chin-lift", "confident-neutral", "decisive-smile"],
	"confident-extended": ["calm-authority", "proud-satisfied"],
	"empathy": ["reassuring-smile", "soft-concern", "sympathetic"],
	"empathy-extended": ["compassionate", "gentle-nod"],
	"playful": ["amused-squint", "eyebrow-raise", "smirk"],
	"playful-extended": ["cheeky-grin", "playful-eye-roll", "teasing-wink"],
	"positive": ["encouraging"],
	"positive-extended": ["delighted", "excited", "proud-of-you"],
	"reaction": ["impressed", "skeptical", "surprised"],
	"reaction-extended": ["deadpan", "exasperated"],
	"stress": ["alert-wide-eyes", "urgent-serious", "worried-furrow"],
	"stress-extended": ["alarmed"],
}

# State-based pose variants
const POSE_VARIANTS := {
	"look-up": "thinking",
	"look-down": "shy", 
	"tilt-left": "curious",
	"tilt-right": "confident",
	"head-back": "surprised"
}

# Asset path configuration
@export var assets_base_path: String = "res://assets/expressions/"
@export var use_external_path: bool = false
@export var external_base_path: String = ""

# Sprite reference
@export var target_sprite: Sprite2D

# Expression state
var current_expression: String = ""
var current_category: String = "confident"
var current_pose: String = "neutral"

# Loaded textures cache
var texture_cache: Dictionary = {}

# Transition settings
@export var crossfade_duration: float = 0.2
var is_transitioning: bool = false


func _ready() -> void:
	# Pre-load common expressions
	_preload_category("confident")
	_preload_category("empathy")
	
	# Load initial expression if target_sprite is set
	if target_sprite:
		var texture := _load_expression_texture(current_expression, current_category)
		if texture:
			target_sprite.texture = texture


func set_expression(expression_name: String, category: String = "") -> void:
	"""Set expression by name. Category is auto-detected if not provided."""
	if expression_name == current_expression:
		return
	
	# Auto-detect category if not provided
	if category.is_empty():
		category = _find_category_for_expression(expression_name)
	
	var old_expr := current_expression
	current_expression = expression_name
	current_category = category
	
	var texture := _load_expression_texture(expression_name, category)
	if texture and target_sprite:
		if crossfade_duration > 0:
			_crossfade_to(texture)
		else:
			target_sprite.texture = texture
	
	expression_changed.emit(old_expr, expression_name)


func set_expression_by_emotion(emotion: String) -> void:
	"""Map high-level emotion to best matching expression."""
	var mapping := {
		"neutral": "confident-neutral",
		"confident": "chin-lift",
		"serious": "focused-stare",
		"happy": "delighted",
		"concerned": "soft-concern",
		"thinking": "pondering",
		"surprised": "surprised",
		"focused": "brow-pinch",
		"amused": "amused-squint",
		"empathetic": "sympathetic",
	}
	
	var expression: String = str(mapping.get(emotion, "confident-neutral"))
	var category: String = _find_category_for_expression(expression)
	set_expression(expression, category)


func set_pose(pose: String) -> void:
	"""Set head pose (look-up, tilt-left, etc.)."""
	current_pose = pose
	# Load variant if available, otherwise stay with current expression
	_update_for_pose()


func _find_category_for_expression(expression_name: String) -> String:
	"""Find which category contains the given expression."""
	for category in EXPRESSION_CATEGORIES:
		var expressions: Array = EXPRESSION_CATEGORIES[category]
		for expr in expressions:
			if expr == expression_name or expression_name.contains(expr):
				return category
	return "confident"  # Default


func _load_expression_texture(expression_name: String, category: String) -> Texture2D:
	"""Load texture for expression, using cache if available."""
	var cache_key := "%s/%s" % [category, expression_name]
	
	if texture_cache.has(cache_key):
		return texture_cache[cache_key]
	
	var path := _get_expression_path(expression_name, category)
	print("Loading expression: ", path)
	
	if ResourceLoader.exists(path):
		var resource = load(path)
		print("Resource type: ", typeof(resource), " - ", resource)
		if resource is Texture2D:
			print("SUCCESS - Loaded as Texture2D: ", path)
			texture_cache[cache_key] = resource
			expression_loaded.emit(expression_name)
			return resource
		elif resource is Image:
			print("Converting Image to ImageTexture")
			var image_texture := ImageTexture.create_from_image(resource)
			texture_cache[cache_key] = image_texture
			expression_loaded.emit(expression_name)
			return image_texture
		elif resource != null:
			print("Resource loaded but wrong type: ", resource.get_class())
		else:
			print("FAILED - load() returned null for: ", path)
	else:
		print("NOT FOUND - Path does not exist: ", path)
	
	push_warning("Expression not found: " + path)
	return null


func _get_expression_path(expression_name: String, category: String) -> String:
	"""Construct path to expression image."""
	var base := external_base_path if use_external_path else assets_base_path
	var filename := "zena-%s.png" % expression_name
	return "%s%s/%s" % [base, category, filename]


func _preload_category(category: String) -> void:
	"""Pre-load all expressions in a category for faster switching."""
	if not EXPRESSION_CATEGORIES.has(category):
		return
	
	var expressions: Array = EXPRESSION_CATEGORIES[category]
	for expr in expressions:
		_load_expression_texture(expr, category)


func _update_for_pose() -> void:
	"""Update expression to pose variant if available."""
	if current_pose == "neutral":
		return
	
	# Try to find pose variant
	var variant_path := _get_pose_variant_path(current_expression, current_pose)
	if ResourceLoader.exists(variant_path):
		var texture := load(variant_path) as Texture2D
		if texture and target_sprite:
			target_sprite.texture = texture


func _get_pose_variant_path(expression_name: String, pose: String) -> String:
	"""Get path to pose variant of expression."""
	var base := external_base_path if use_external_path else assets_base_path
	var filename := "zena-%s-%s.png" % [expression_name, pose]
	return "%s%s/%s" % [base, pose, filename]


func _crossfade_to(new_texture: Texture2D) -> void:
	"""Smooth crossfade transition to new texture."""
	if not target_sprite or is_transitioning:
		target_sprite.texture = new_texture
		return
	
	is_transitioning = true
	
	var tween := create_tween()
	tween.tween_property(target_sprite, "modulate:a", 0.0, crossfade_duration * 0.5)
	tween.tween_callback(func(): target_sprite.texture = new_texture)
	tween.tween_property(target_sprite, "modulate:a", 1.0, crossfade_duration * 0.5)
	tween.tween_callback(func(): is_transitioning = false)


func get_available_expressions() -> Array:
	"""Get list of all available expression names."""
	var all_expressions := []
	for category in EXPRESSION_CATEGORIES:
		var expressions: Array = EXPRESSION_CATEGORIES[category]
		for expr in expressions:
			all_expressions.append(expr)
	return all_expressions


func get_random_expression_from_category(category: String) -> String:
	"""Get a random expression from the given category."""
	if not EXPRESSION_CATEGORIES.has(category):
		return "confident-neutral"
	
	var expressions: Array = EXPRESSION_CATEGORIES[category]
	return str(expressions[randi() % expressions.size()])


func cycle_expression_in_category(category: String) -> void:
	"""Cycle to next expression in current category."""
	if not EXPRESSION_CATEGORIES.has(category):
		return
	
	var expressions: Array = EXPRESSION_CATEGORIES[category]
	var current_idx: int = expressions.find(current_expression)
	var next_idx: int = (current_idx + 1) % expressions.size()
	set_expression(str(expressions[next_idx]), category)
