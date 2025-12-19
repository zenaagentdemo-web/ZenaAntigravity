# Avatar State Machine
# Manages Idle, Listening, Thinking, Speaking states with smooth transitions
extends Node
class_name AvatarStateMachine

signal state_changed(old_state: String, new_state: String)
signal state_entered(state: String)
signal state_exited(state: String)

enum State { IDLE, LISTENING, THINKING, SPEAKING }

const STATE_NAMES := {
	State.IDLE: "idle",
	State.LISTENING: "listening",
	State.THINKING: "thinking",
	State.SPEAKING: "speaking"
}

@export var transition_duration: float = 0.3

var current_state: State = State.IDLE
var previous_state: State = State.IDLE
var state_time: float = 0.0
var is_transitioning: bool = false

# State-specific parameters
var speaking_intensity: float = 0.0
var listening_attention: float = 1.0
var thinking_progress: float = 0.0


func _ready() -> void:
	_enter_state(current_state)


func _process(delta: float) -> void:
	state_time += delta
	_update_state(delta)


func transition_to(new_state: State) -> void:
	if new_state == current_state:
		return
	
	previous_state = current_state
	state_exited.emit(STATE_NAMES[current_state])
	
	current_state = new_state
	state_time = 0.0
	is_transitioning = true
	
	_enter_state(new_state)
	state_changed.emit(STATE_NAMES[previous_state], STATE_NAMES[new_state])
	state_entered.emit(STATE_NAMES[new_state])


func transition_to_by_name(state_name: String) -> void:
	for state in STATE_NAMES:
		if STATE_NAMES[state] == state_name.to_lower():
			transition_to(state)
			return
	push_warning("Unknown state name: " + state_name)


func get_state_name() -> String:
	return STATE_NAMES[current_state]


func get_transition_progress() -> float:
	if not is_transitioning:
		return 1.0
	return clampf(state_time / transition_duration, 0.0, 1.0)


func _enter_state(state: State) -> void:
	match state:
		State.IDLE:
			speaking_intensity = 0.0
		State.LISTENING:
			listening_attention = 1.0
		State.THINKING:
			thinking_progress = 0.0
		State.SPEAKING:
			speaking_intensity = 1.0


func _update_state(delta: float) -> void:
	# Check if transition completed
	if is_transitioning and state_time >= transition_duration:
		is_transitioning = false
	
	# State-specific updates
	match current_state:
		State.IDLE:
			_update_idle(delta)
		State.LISTENING:
			_update_listening(delta)
		State.THINKING:
			_update_thinking(delta)
		State.SPEAKING:
			_update_speaking(delta)


func _update_idle(_delta: float) -> void:
	# Idle fades out any remaining intensity
	speaking_intensity = lerpf(speaking_intensity, 0.0, 0.1)


func _update_listening(_delta: float) -> void:
	# Listening maintains attention, small variations
	listening_attention = 0.9 + randf() * 0.1


func _update_thinking(delta: float) -> void:
	# Thinking shows progress animation
	thinking_progress = fmod(thinking_progress + delta * 0.5, 1.0)


func _update_speaking(_delta: float) -> void:
	# Speaking intensity managed externally via set_speaking_intensity()
	pass


func set_speaking_intensity(intensity: float) -> void:
	speaking_intensity = clampf(intensity, 0.0, 1.0)


# Convenience methods for common transitions
func go_idle() -> void:
	transition_to(State.IDLE)


func start_listening() -> void:
	transition_to(State.LISTENING)


func start_thinking() -> void:
	transition_to(State.THINKING)


func start_speaking() -> void:
	transition_to(State.SPEAKING)


func is_speaking() -> bool:
	return current_state == State.SPEAKING


func is_idle() -> bool:
	return current_state == State.IDLE
