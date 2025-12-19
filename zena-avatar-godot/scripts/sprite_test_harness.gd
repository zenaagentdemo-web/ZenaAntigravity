# Sprite-Based Avatar Test Harness
# Uses pre-rendered Zena expressions from the existing library
extends Control

@onready var avatar: Node2D = $Avatar
@onready var avatar_sprite: Sprite2D = $Avatar/ZenaSprite
@onready var expression_manager: Node = $Avatar/ExpressionSpriteManager
@onready var mouth_controller: Node = $Avatar/MouthSpriteController
@onready var mouth_sprite: Sprite2D = $Avatar/MouthSprite
@onready var status_label: Label = $UI/StatusLabel
@onready var expression_label: Label = $UI/ExpressionLabel

var is_talking: bool = false
var talk_time: float = 0.0

var categories := ["confident", "empathy", "playful", "analytical", "reaction", "stress", "positive"]
var current_category_idx := 0

var current_viseme_idx: int = 0
var viseme_codes := ["X", "A", "B", "C", "D", "E", "F", "G", "H"]


func _ready() -> void:
	print("--- Test Harness Ready ---")
	print("Avatar Sprite: ", avatar_sprite)
	print("Expression Manager: ", expression_manager)
	
	# Connect expression sprite manager to the main sprite
	if expression_manager and avatar_sprite:
		expression_manager.target_sprite = avatar_sprite
		# Load initial expression
		expression_manager.set_expression_by_emotion("neutral")
		
		print("Sprite Visible: ", avatar_sprite.visible)
		print("Sprite Texture: ", avatar_sprite.texture)
		print("Sprite Alpha: ", avatar_sprite.modulate.a)
		print("Sprite Global Pos: ", avatar_sprite.global_position)
	
	# Connect mouth controller to mouth sprite
	if mouth_controller and mouth_sprite:
		mouth_controller.mouth_sprite = mouth_sprite
		print("Mouth Controller set up")
		
	_update_status()


func _process(delta: float) -> void:
	# Simulate talking animation when M is held
	if is_talking:
		talk_time += delta
		var amplitude: float = (sin(talk_time * 15.0) + 1.0) / 2.0 * 0.8 + randf() * 0.2
		if mouth_controller:
			# print("TICK-AMP: ", amplitude) # Silence this for now to avoid spam
			mouth_controller.set_amplitude(amplitude)
		else:
			push_error("Mouth Controller MISSING in _process")


func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_1:
				_set_idle()
			KEY_2:
				_set_listening()
			KEY_3:
				_set_thinking()
			KEY_4:
				_set_speaking()
			KEY_E:
				_cycle_expression()
			KEY_C:
				_cycle_category()
			KEY_B:
				_trigger_blink()
			KEY_R:
				_random_expression()
			KEY_LEFT:
				_set_pose("tilt-left")
			KEY_RIGHT:
				_set_pose("tilt-right")
			KEY_UP:
				_set_pose("look-up")
			KEY_DOWN:
				_set_pose("look-down")
			KEY_M:
				_toggle_talking()
			KEY_V:
				_cycle_viseme()


func _set_idle() -> void:
	if avatar.has_node("StateMachine"):
		avatar.get_node("StateMachine").go_idle()
	expression_manager.set_expression_by_emotion("neutral")
	_update_status()


func _set_listening() -> void:
	if avatar.has_node("StateMachine"):
		avatar.get_node("StateMachine").start_listening()
	expression_manager.set_expression_by_emotion("empathetic")
	_update_status()


func _set_thinking() -> void:
	if avatar.has_node("StateMachine"):
		avatar.get_node("StateMachine").start_thinking()
	expression_manager.set_expression_by_emotion("thinking")
	expression_manager.set_pose("look-up")
	_update_status()


func _set_speaking() -> void:
	if avatar.has_node("StateMachine"):
		avatar.get_node("StateMachine").start_speaking()
	expression_manager.set_expression_by_emotion("confident")
	_update_status()


func _cycle_expression() -> void:
	var category: String = str(categories[current_category_idx])
	expression_manager.cycle_expression_in_category(category)
	_update_status()


func _cycle_category() -> void:
	current_category_idx = (current_category_idx + 1) % categories.size()
	var category: String = str(categories[current_category_idx])
	var expr: String = expression_manager.get_random_expression_from_category(category)
	expression_manager.set_expression(expr, category)
	status_label.text = "Category: " + category


func _random_expression() -> void:
	var category: String = str(categories[randi() % categories.size()])
	var expr: String = expression_manager.get_random_expression_from_category(category)
	expression_manager.set_expression(expr, category)
	_update_status()


func _trigger_blink() -> void:
	# Simple blink effect using modulate
	var tween: Tween = create_tween()
	tween.tween_property(avatar_sprite, "modulate:a", 0.3, 0.1)
	tween.tween_property(avatar_sprite, "modulate:a", 1.0, 0.15)


func _set_pose(pose: String) -> void:
	expression_manager.set_pose(pose)
	status_label.text = "Pose: " + pose


func _update_status() -> void:
	if expression_manager:
		expression_label.text = "Expression: " + expression_manager.current_expression
	var state_name: String = "unknown"
	if avatar.has_node("StateMachine"):
		state_name = avatar.get_node("StateMachine").get_state_name()
	var talking_str: String = " | Mouth: OFF"
	if is_talking:
		talking_str = " | Mouth: TALKING"
	status_label.text = "State: " + state_name + " | Cat: " + str(categories[current_category_idx]) + talking_str


func _toggle_talking() -> void:
	is_talking = not is_talking
	if is_talking:
		talk_time = 0.0
		if mouth_controller:
			mouth_controller.start_speaking()
	else:
		if mouth_controller:
			mouth_controller.stop_speaking()
	_update_status()


func _cycle_viseme() -> void:
	current_viseme_idx = (current_viseme_idx + 1) % viseme_codes.size()
	var vis: String = str(viseme_codes[current_viseme_idx])
	if mouth_controller:
		mouth_controller.set_viseme(vis)
	status_label.text = "Viseme: " + vis
