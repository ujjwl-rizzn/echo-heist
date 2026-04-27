extends Node2D

enum State { PATROL, SUSPICIOUS, INVESTIGATE, ALERT, CALLING_BACKUP, SEARCH, STUNNED }

var base_speed := 54.0
var move_speed := 54.0
var fov_degrees := 90.0
var awareness_rate := 0.8
var max_alerts := 2
var patrol_points: Array[Vector2] = []
var player_ref: Node2D
var state := State.PATROL
var awareness := 0.0
var last_known_pos := Vector2.ZERO
var backup_called := false
var stun_timer := 0.0
var search_timer := 0.0
var backup_timer := 0.0
var patrol_idx := 0
var disabled := false
var body: Polygon2D
var cone: Polygon2D

signal backup_requested(position: Vector2, caller: Node2D)
signal player_spotted(guard: Node2D)

func setup(points: Array[Vector2], player: Node2D, color: Color) -> void:
	patrol_points = points
	player_ref = player
	global_position = points[0]
	DADS.apply_to_guard(self)
	_build_visuals(color)

func _physics_process(delta: float) -> void:
	if disabled:
		return
	match state:
		State.PATROL:
			_do_patrol(delta)
		State.SUSPICIOUS:
			_do_suspicious(delta)
		State.INVESTIGATE:
			_do_investigate(delta)
		State.ALERT:
			_do_alert(delta)
		State.CALLING_BACKUP:
			_do_calling_backup(delta)
		State.SEARCH:
			_do_search(delta)
		State.STUNNED:
			_do_stunned(delta)
	_update_visuals()

func stun(duration: float = 60.0) -> void:
	stun_timer = duration
	_transition_to(State.STUNNED)

func takedown(lethal: bool) -> void:
	disabled = true
	modulate = Color(0.35, 0.35, 0.35, 0.55)
	EventBus.player_takedown.emit(self, lethal)

func _do_patrol(delta: float) -> void:
	if patrol_points.is_empty():
		return
	_move_toward(patrol_points[patrol_idx], delta, 1.0)
	if global_position.distance_to(patrol_points[patrol_idx]) < 5.0:
		patrol_idx = (patrol_idx + 1) % patrol_points.size()
	if _scan_for_player():
		_transition_to(State.SUSPICIOUS)

func _do_suspicious(delta: float) -> void:
	if _scan_for_player():
		awareness += delta * awareness_rate * _distance_factor()
		last_known_pos = player_ref.global_position
		if awareness >= 1.0:
			_transition_to(State.ALERT)
		elif awareness >= 0.5:
			_transition_to(State.INVESTIGATE)
	else:
		awareness = maxf(0.0, awareness - delta * 0.45)
		if awareness <= 0.0:
			_transition_to(State.PATROL)

func _do_investigate(delta: float) -> void:
	_move_toward(last_known_pos, delta, 0.8)
	if _scan_for_player():
		awareness += delta * awareness_rate * 1.4
		last_known_pos = player_ref.global_position
		if awareness >= 1.0:
			_transition_to(State.ALERT)
	elif global_position.distance_to(last_known_pos) < 8.0:
		_transition_to(State.SEARCH)

func _do_alert(delta: float) -> void:
	if not backup_called:
		_transition_to(State.CALLING_BACKUP)
		return
	if is_instance_valid(player_ref):
		last_known_pos = player_ref.global_position
	_move_toward(last_known_pos, delta, 1.35)

func _do_calling_backup(delta: float) -> void:
	backup_timer += delta
	if backup_timer >= 2.2:
		backup_called = true
		backup_requested.emit(global_position, self)
		player_spotted.emit(self)
		EventBus.guard_spotted_player.emit(self, player_ref)
		_transition_to(State.ALERT)

func _do_search(delta: float) -> void:
	search_timer -= delta
	_move_toward(last_known_pos, delta, 0.75)
	if _scan_for_player():
		awareness = 1.0
		_transition_to(State.ALERT)
	elif search_timer <= 0.0:
		awareness = 0.0
		_transition_to(State.PATROL)

func _do_stunned(delta: float) -> void:
	stun_timer -= delta
	if stun_timer <= 0.0:
		awareness = 0.0
		_transition_to(State.PATROL)

func _transition_to(new_state: State) -> void:
	if state != State.ALERT and new_state == State.ALERT:
		GameState.register_alert(1.0)
		AudioManager.play_sfx("alert")
	match new_state:
		State.CALLING_BACKUP:
			backup_timer = 0.0
		State.SEARCH:
			search_timer = 12.0
		State.STUNNED:
			awareness = 0.0
	state = new_state

func _scan_for_player() -> bool:
	if not is_instance_valid(player_ref):
		return false
	var to_player := player_ref.global_position - global_position
	if to_player.length() > 168.0:
		return false
	var facing := Vector2.RIGHT.rotated(global_rotation)
	var angle := absf(facing.angle_to(to_player.normalized()))
	return angle <= deg_to_rad(fov_degrees * 0.5)

func _distance_factor() -> float:
	if not is_instance_valid(player_ref):
		return 0.0
	var dist := global_position.distance_to(player_ref.global_position)
	return clampf(1.0 - (dist / 180.0), 0.12, 1.0)

func _move_toward(target: Vector2, delta: float, speed_mod: float) -> void:
	var to_target := target - global_position
	if to_target.length() <= 2.0:
		return
	global_position += to_target.normalized() * move_speed * speed_mod * delta
	global_rotation = lerp_angle(global_rotation, to_target.angle(), 8.0 * delta)

func _build_visuals(color: Color) -> void:
	cone = Polygon2D.new()
	cone.name = "FOVCone"
	cone.polygon = PackedVector2Array([Vector2(0, 0), Vector2(150, -55), Vector2(150, 55)])
	cone.color = Color(1.0, 0.75, 0.18, 0.12)
	add_child(cone)
	body = Polygon2D.new()
	body.name = "GuardBody"
	body.polygon = PackedVector2Array([Vector2(-6, -10), Vector2(9, -7), Vector2(9, 12), Vector2(-8, 12)])
	body.color = color
	add_child(body)

func _update_visuals() -> void:
	if cone:
		match state:
			State.PATROL:
				cone.color = Color(1.0, 0.75, 0.18, 0.12)
			State.SUSPICIOUS, State.INVESTIGATE:
				cone.color = Color(1.0, 0.45, 0.1, 0.2)
			State.ALERT, State.CALLING_BACKUP:
				cone.color = Color(1.0, 0.05, 0.08, 0.28)
			State.STUNNED:
				cone.color = Color(0.1, 0.1, 0.1, 0.05)
