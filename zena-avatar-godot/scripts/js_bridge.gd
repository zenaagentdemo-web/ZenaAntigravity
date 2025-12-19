# JavaScript Bridge
# Handles communication between React/Web and Godot via JavaScriptBridge
extends Node

signal message_received(data: Dictionary)
signal state_requested(state: String)
signal expression_requested(expression: String, intensity: float)
signal visemes_received(visemes: Array)
signal animation_plan_received(plan: Dictionary)

var js_callback: JavaScriptObject = null
var is_web: bool = false


func _ready() -> void:
	is_web = OS.has_feature("web")
	
	if is_web:
		_setup_javascript_bridge()


func _setup_javascript_bridge() -> void:
	"""Set up JavaScript interop for web builds."""
	# Create a callback that JavaScript can call
	js_callback = JavaScriptBridge.create_callback(_on_js_message)
	
	# Register the callback with the window object
	var window := JavaScriptBridge.get_interface("window")
	if window:
		window.godotMessageHandler = js_callback
		
		# Also set up a postMessage listener
		var code := """
		window.addEventListener('message', function(event) {
			if (event.data && typeof event.data === 'object') {
				if (window.godotMessageHandler) {
					window.godotMessageHandler(JSON.stringify(event.data));
				}
			}
		});
		
		// Notify parent that Godot is ready
		if (window.parent !== window) {
			window.parent.postMessage({ type: 'GODOT_READY' }, '*');
		}
		"""
		JavaScriptBridge.eval(code)
		
		print("AvatarBridge: JavaScript bridge initialized")


func _on_js_message(args: Array) -> void:
	"""Handle incoming message from JavaScript."""
	if args.is_empty():
		return
	
	var json_str: String = args[0]
	var json := JSON.new()
	var error := json.parse(json_str)
	
	if error != OK:
		push_warning("AvatarBridge: Failed to parse JSON: " + json_str)
		return
	
	var data: Dictionary = json.data
	_process_message(data)


func _process_message(data: Dictionary) -> void:
	"""Process a message from the web frontend."""
	var msg_type: String = data.get("type", "")
	
	match msg_type:
		"SET_STATE":
			var state: String = data.get("state", "idle")
			state_requested.emit(state)
			
			# Also handle inline expression if provided
			if data.has("expression"):
				expression_requested.emit(
					data.get("expression", "neutral"),
					data.get("intensity", 1.0)
				)
			
			# Handle inline visemes if provided
			if data.has("visemes"):
				visemes_received.emit(data.get("visemes", []))
		
		"SET_EXPRESSION":
			var expression: String = data.get("expression", "neutral")
			var intensity: float = data.get("intensity", 1.0)
			expression_requested.emit(expression, intensity)
		
		"PLAY_VISEMES":
			var visemes: Array = data.get("visemes", [])
			visemes_received.emit(visemes)
		
		"PLAY_ANIMATION_PLAN":
			animation_plan_received.emit(data)
		
		"TRIGGER_BLINK":
			# Let avatar controller handle this
			message_received.emit({"action": "blink"})
		
		"LOOK_AT":
			var x: float = data.get("x", 0.0)
			var y: float = data.get("y", 0.0)
			message_received.emit({"action": "look_at", "x": x, "y": y})
		
		"SET_AMPLITUDE":
			var amplitude: float = data.get("amplitude", 0.0)
			message_received.emit({"action": "set_amplitude", "amplitude": amplitude})
		
		_:
			# Unknown message type, emit generic signal
			message_received.emit(data)


func send_to_js(data: Dictionary) -> void:
	"""Send a message from Godot to JavaScript/React."""
	if not is_web:
		return
	
	var json := JSON.stringify(data)
	var code := "if (window.parent !== window) { window.parent.postMessage(%s, '*'); }" % json
	JavaScriptBridge.eval(code)


func notify_state_changed(old_state: String, new_state: String) -> void:
	"""Notify JavaScript that avatar state changed."""
	send_to_js({
		"type": "STATE_CHANGED",
		"oldState": old_state,
		"newState": new_state
	})


func notify_speaking_finished() -> void:
	"""Notify JavaScript that speaking animation finished."""
	send_to_js({
		"type": "SPEAKING_FINISHED"
	})


func notify_visemes_finished() -> void:
	"""Notify JavaScript that viseme timeline finished."""
	send_to_js({
		"type": "VISEMES_FINISHED"
	})


func notify_ready() -> void:
	"""Notify JavaScript that avatar is fully loaded and ready."""
	send_to_js({
		"type": "AVATAR_READY"
	})


# For non-web testing
func simulate_message(data: Dictionary) -> void:
	"""Simulate receiving a message (for testing in editor)."""
	_process_message(data)
