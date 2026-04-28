## GuardAI.gd — VISUAL UPGRADE: Full armored guard character
## Replaces simple polygon with multi-part human guard silhouette
extends Node2D

enum State { PATROL, SUSPICIOUS, INVESTIGATE, ALERT, CALLING_BACKUP, SEARCH, STUNNED }

var base_speed    := 54.0
var move_speed    := 54.0
var fov_degrees   := 90.0
var awareness_rate:= 0.8
var max_alerts    := 2

var patrol_points: Array[Vector2] = []
var player_ref:    Node2D
var state          := State.PATROL
var awareness      := 0.0
var last_known_pos := Vector2.ZERO
var backup_called  := false
var stun_timer     := 0.0
var search_timer   := 0.0
var backup_timer   := 0.0
var patrol_idx     := 0
var disabled       := false
var _guard_color   := Color.html("#ffd166")

# Visual nodes
var _shadow:     Polygon2D
var _cone:       Polygon2D
var _body:       Polygon2D
var _head:       Polygon2D
var _helmet:     Polygon2D
var _left_arm:   Polygon2D
var _right_arm:  Polygon2D
var _left_leg:   Polygon2D
var _right_leg:  Polygon2D
var _weapon:     Polygon2D
var _visor:      Polygon2D
var _alert_ring: Polygon2D
var _shoulder_l: Polygon2D
var _shoulder_r: Polygon2D
var _awareness_bar: ColorRect

# Animation
var _anim_time   := 0.0
var _walk_cycle  := 0.0
var _is_moving   := false

signal backup_requested(position: Vector2, caller: Node2D)
signal player_spotted(guard: Node2D)

func setup(points: Array[Vector2], player: Node2D, color: Color) -> void:
	patrol_points = points
	player_ref    = player
	global_position = points[0]
	_guard_color  = color
	DADS.apply_to_guard(self)
	_build_character()

func _physics_process(delta: float) -> void:
	if disabled:
		_anim_time += delta
		_animate_stunned(delta)
		return
	_anim_time  += delta
	_walk_cycle += delta
	_is_moving = false
	match state:
		State.PATROL:         _do_patrol(delta)
		State.SUSPICIOUS:     _do_suspicious(delta)
		State.INVESTIGATE:    _do_investigate(delta)
		State.ALERT:          _do_alert(delta)
		State.CALLING_BACKUP: _do_calling_backup(delta)
		State.SEARCH:         _do_search(delta)
		State.STUNNED:        _do_stunned(delta)
	_update_visuals(delta)

func stun(duration: float = 60.0) -> void:
	stun_timer = duration
	_transition_to(State.STUNNED)

func takedown(lethal: bool) -> void:
	disabled = true
	modulate = Color(0.3, 0.3, 0.4, 0.5)
	if _cone: _cone.visible = false
	if _alert_ring: _alert_ring.visible = false
	EventBus.player_takedown.emit(self, lethal)

# ── AI STATES ──────────────────────────────────────────────────────
func _do_patrol(delta: float) -> void:
	if patrol_points.is_empty(): return
	_move_toward(patrol_points[patrol_idx], delta, 1.0)
	if global_position.distance_to(patrol_points[patrol_idx]) < 5.0:
		patrol_idx = (patrol_idx + 1) % patrol_points.size()
	if _scan_for_player(): _transition_to(State.SUSPICIOUS)

func _do_suspicious(delta: float) -> void:
	if _scan_for_player():
		awareness += delta * awareness_rate * _distance_factor()
		last_known_pos = player_ref.global_position
		if awareness >= 1.0: _transition_to(State.ALERT)
		elif awareness >= 0.5: _transition_to(State.INVESTIGATE)
	else:
		awareness = maxf(0.0, awareness - delta * 0.45)
		if awareness <= 0.0: _transition_to(State.PATROL)

func _do_investigate(delta: float) -> void:
	_move_toward(last_known_pos, delta, 0.8)
	if _scan_for_player():
		awareness += delta * awareness_rate * 1.4
		last_known_pos = player_ref.global_position
		if awareness >= 1.0: _transition_to(State.ALERT)
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
		State.CALLING_BACKUP: backup_timer  = 0.0
		State.SEARCH:         search_timer  = 12.0
		State.STUNNED:        awareness     = 0.0
	state = new_state

# ── BUILD CHARACTER ────────────────────────────────────────────────
func _build_character() -> void:
	var is_crime := _guard_color.r > 0.5  # crime guards are red/green
	var suit     := Color.html("#1e2a1e")  # dark armored suit
	var armor    := Color(0.3, 0.35, 0.3, 1.0)
	var visor_c  := Color.html("#ffcc00")

	# ── Ground shadow ────────────────────────────────────────────
	_shadow = _ellipse(10, 5, Color(0,0,0,0.4), 12)
	_shadow.position = Vector2(0, 10)
	add_child(_shadow)

	# ── FOV cone ─────────────────────────────────────────────────
	_cone = Polygon2D.new()
	_cone.name = "FOVCone"
	_cone.polygon = _make_fov_fan(fov_degrees, 150.0, 16)
	_cone.color   = Color(1.0, 0.75, 0.18, 0.10)
	add_child(_cone)

	# ── Alert ring ───────────────────────────────────────────────
	_alert_ring = _ellipse(18, 16, Color(1,0,0,0), 16)
	_alert_ring.name = "AlertRing"
	add_child(_alert_ring)

	# ── Legs ─────────────────────────────────────────────────────
	_left_leg = Polygon2D.new()
	_left_leg.polygon = PackedVector2Array([
		Vector2(-6, 4), Vector2(-2, 4),
		Vector2(-2,12), Vector2(-6,12)
	])
	_left_leg.color = suit
	add_child(_left_leg)

	_right_leg = Polygon2D.new()
	_right_leg.polygon = PackedVector2Array([
		Vector2(2, 4), Vector2(6, 4),
		Vector2(6,12), Vector2(2,12)
	])
	_right_leg.color = suit
	add_child(_right_leg)

	# ── Body / torso ─────────────────────────────────────────────
	_body = Polygon2D.new()
	_body.name = "Body"
	_body.polygon = PackedVector2Array([
		Vector2(-7, -5), Vector2(7, -5),
		Vector2(8,  4),  Vector2(-8,  4)
	])
	_body.color = suit
	add_child(_body)

	# ── Chest armor plate ─────────────────────────────────────────
	var chest := Polygon2D.new()
	chest.polygon = PackedVector2Array([
		Vector2(-5,-4), Vector2(5,-4),
		Vector2(5, 2),  Vector2(-5, 2)
	])
	chest.color = armor
	add_child(chest)

	# ── Shoulder pads ─────────────────────────────────────────────
	_shoulder_l = _ellipse(4, 3, armor, 8)
	_shoulder_l.position = Vector2(-9, -4)
	add_child(_shoulder_l)

	_shoulder_r = _ellipse(4, 3, armor, 8)
	_shoulder_r.position = Vector2(9, -4)
	add_child(_shoulder_r)

	# ── Arms ──────────────────────────────────────────────────────
	_left_arm = Polygon2D.new()
	_left_arm.polygon = PackedVector2Array([
		Vector2(-12,-4), Vector2(-7,-4),
		Vector2(-8,  3), Vector2(-12, 3)
	])
	_left_arm.color = suit
	add_child(_left_arm)

	_right_arm = Polygon2D.new()
	_right_arm.polygon = PackedVector2Array([
		Vector2(7,-4), Vector2(12,-4),
		Vector2(12, 3), Vector2(8,  3)
	])
	_right_arm.color = suit
	add_child(_right_arm)

	# ── Weapon (assault rifle / baton) ────────────────────────────
	_weapon = Polygon2D.new()
	_weapon.name = "Weapon"
	_weapon.polygon = PackedVector2Array([
		Vector2(12,-3), Vector2(22,-3),
		Vector2(22,-1), Vector2(14, 1),
		Vector2(12, 1)
	])
	_weapon.color = Color.html("#404850")
	add_child(_weapon)

	# ── Neck ──────────────────────────────────────────────────────
	var neck := Polygon2D.new()
	neck.polygon = PackedVector2Array([
		Vector2(-2,-7), Vector2(2,-7),
		Vector2(2,-4),  Vector2(-2,-4)
	])
	neck.color = Color.html("#b08060")
	add_child(neck)

	# ── Head ──────────────────────────────────────────────────────
	_head = _ellipse(6, 7, Color.html("#b08060"), 12)
	_head.name = "Head"
	_head.position = Vector2(0, -12)
	add_child(_head)

	# ── Tactical helmet ───────────────────────────────────────────
	_helmet = _ellipse(7, 6, armor, 12)
	_helmet.name = "Helmet"
	_helmet.position = Vector2(0, -13)
	add_child(_helmet)

	# ── Visor glow strip ──────────────────────────────────────────
	_visor = Polygon2D.new()
	_visor.name = "Visor"
	_visor.polygon = PackedVector2Array([
		Vector2(-5,-14), Vector2(5,-14),
		Vector2(5,-12),  Vector2(-5,-12)
	])
	_visor.color = visor_c
	add_child(_visor)

	# ── Awareness bar (above head) ────────────────────────────────
	# Drawn via _draw() instead

func _update_visuals(delta: float) -> void:
	# Walking animation
	var walk_speed_norm := move_speed / 54.0
	var swing := sin(_walk_cycle * walk_speed_norm * 7.0) * 3.5 if _is_moving else 0.0
	if _left_leg:  _left_leg.position.y  =  swing
	if _right_leg: _right_leg.position.y = -swing
	if _left_arm:  _left_arm.position.y  = -swing * 0.6
	if _right_arm: _right_arm.position.y =  swing * 0.6

	# FOV cone color by state
	if _cone:
		match state:
			State.PATROL:
				_cone.color = Color(1.0, 0.75, 0.18, 0.10)
			State.SUSPICIOUS, State.INVESTIGATE:
				_cone.color = Color(1.0, 0.45, 0.10, 0.22)
			State.ALERT, State.CALLING_BACKUP:
				_cone.color = Color(1.0, 0.05, 0.08, 0.32)
			State.SEARCH:
				_cone.color = Color(1.0, 0.55, 0.0, 0.18)
			State.STUNNED:
				_cone.color = Color(0.2, 0.2, 0.8, 0.08)

	# Alert ring pulse
	if _alert_ring:
		match state:
			State.ALERT, State.CALLING_BACKUP:
				var pulse := (sin(_anim_time * 8.0) + 1.0) * 0.5
				_alert_ring.color = Color(1, 0.1, 0.1, pulse * 0.5)
				_alert_ring.scale = Vector2.ONE * (1.0 + pulse * 0.3)
			_:
				_alert_ring.color = Color(1, 0, 0, 0)

	# Visor color by state
	if _visor:
		match state:
			State.PATROL:            _visor.color = Color.html("#ffcc00")
			State.SUSPICIOUS:        _visor.color = Color.html("#ff8800")
			State.INVESTIGATE:       _visor.color = Color.html("#ff4400")
			State.ALERT, State.CALLING_BACKUP: _visor.color = Color.html("#ff0000")
			State.STUNNED:           _visor.color = Color.html("#4444ff")
			_:                       _visor.color = Color.html("#ffcc00")
		# Glow pulse
		_visor.modulate.a = 0.7 + sin(_anim_time * 4.0) * 0.3

	# Awareness bar — draw over head using a simple 2D rect via modulate
	queue_redraw()

func _animate_stunned(_delta: float) -> void:
	# Stars spinning around head when stunned
	var a := _anim_time * 4.0
	if _visor:
		_visor.color    = Color(0.4, 0.4, 1.0, 0.5 + sin(a) * 0.3)
	if _helmet:
		_helmet.rotation = sin(a * 0.5) * 0.1

func _draw() -> void:
	if disabled or state == State.STUNNED:
		return
	# Awareness bar above guard head
	var bar_w   := 18.0
	var bar_h   := 2.5
	var bar_y   := -26.0
	var bar_x   := -bar_w / 2.0
	# Background
	draw_rect(Rect2(bar_x, bar_y, bar_w, bar_h), Color(0.15, 0.15, 0.15, 0.8))
	# Fill
	var fill_w := bar_w * clampf(awareness, 0.0, 1.0)
	var bar_color : Color
	if awareness < 0.4:    bar_color = Color(0.2, 0.9, 0.2, 0.9)
	elif awareness < 0.75: bar_color = Color(1.0, 0.6, 0.0, 0.9)
	else:                  bar_color = Color(1.0, 0.1, 0.1, 0.9)
	if fill_w > 0:
		draw_rect(Rect2(bar_x, bar_y, fill_w, bar_h), bar_color)
	# Question mark when suspicious
	if state == State.SUSPICIOUS and awareness > 0.2:
		draw_string(ThemeDB.fallback_font, Vector2(-3, -30), "?",
			HORIZONTAL_ALIGNMENT_CENTER, -1, 10,
			Color(1.0, 0.8, 0.0, clampf(awareness * 2.0, 0.0, 1.0)))
	elif state in [State.ALERT, State.CALLING_BACKUP]:
		draw_string(ThemeDB.fallback_font, Vector2(-4, -30), "!",
			HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color(1, 0, 0, 1))

# ── HELPERS ────────────────────────────────────────────────────────
func _scan_for_player() -> bool:
	if not is_instance_valid(player_ref): return false
	var to_player := player_ref.global_position - global_position
	if to_player.length() > 168.0: return false
	var fwd   := Vector2.RIGHT.rotated(global_rotation)
	var angle := absf(fwd.angle_to(to_player.normalized()))
	if "in_shadow" in player_ref and player_ref.in_shadow and to_player.length() > 48.0:
		return false
	return angle <= deg_to_rad(fov_degrees * 0.5)

func _distance_factor() -> float:
	if not is_instance_valid(player_ref): return 0.0
	return clampf(1.0 - (global_position.distance_to(player_ref.global_position) / 180.0), 0.12, 1.0)

func _move_toward(target: Vector2, delta: float, speed_mod: float) -> void:
	var to_t := target - global_position
	if to_t.length() <= 2.0: return
	global_position += to_t.normalized() * move_speed * speed_mod * delta
	global_rotation  = lerp_angle(global_rotation, to_t.angle(), 8.0 * delta)
	_is_moving = true

func _ellipse(rx: float, ry: float, color: Color, pts: int = 12) -> Polygon2D:
	var p     := Polygon2D.new()
	var verts := PackedVector2Array()
	for i in pts:
		var a := TAU * float(i) / float(pts)
		verts.append(Vector2(cos(a) * rx, sin(a) * ry))
	p.polygon = verts
	p.color   = color
	return p

func _make_fov_fan(degrees: float, radius: float, segments: int) -> PackedVector2Array:
	var pts   := PackedVector2Array()
	var half  := deg_to_rad(degrees * 0.5)
	pts.append(Vector2.ZERO)
	for i in segments + 1:
		var a: float = lerpf(-half, half, float(i) / float(segments))
		pts.append(Vector2(cos(a) * radius, sin(a) * radius))
	return pts
