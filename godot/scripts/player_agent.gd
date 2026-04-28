## player_agent.gd — VISUAL UPGRADE: Full human ninja/spy character
## Replaces the simple polygon with a detailed multi-part human silhouette
extends CharacterBody2D

const WALK_SPEED   := 92.0
const CROUCH_SPEED := 48.0
const SPRINT_SPEED := 145.0

var external_move  := Vector2.ZERO
var is_crouching   := false
var in_shadow      := false
var facing         := Vector2.RIGHT
var _path          := "spy"

# Visual parts
var _shadow:      Polygon2D
var _cape:        Polygon2D
var _body:        Polygon2D
var _head:        Polygon2D
var _left_arm:    Polygon2D
var _right_arm:   Polygon2D
var _left_leg:    Polygon2D
var _right_leg:   Polygon2D
var _visor:       Polygon2D
var _eye_l:       Polygon2D
var _eye_r:       Polygon2D
var _weapon:      Polygon2D
var _aura:        Polygon2D
var _cloak_glow:  Polygon2D

# Animation state
var _anim_time  := 0.0
var _walk_cycle := 0.0
var _is_moving  := false
var _bob        := 0.0

func _ready() -> void:
	_build_character()
	_add_shadow_light()

func _physics_process(delta: float) -> void:
	var input_vec := _read_input() + external_move
	if input_vec.length() > 1.0:
		input_vec = input_vec.normalized()

	is_crouching = Input.is_key_pressed(KEY_C)
	var spd := WALK_SPEED
	if is_crouching:              spd = CROUCH_SPEED
	elif Input.is_key_pressed(KEY_SHIFT): spd = SPRINT_SPEED

	velocity = input_vec * spd
	move_and_slide()

	_is_moving = input_vec.length() > 0.05
	if _is_moving:
		facing = input_vec.normalized()
		rotation = lerp_angle(rotation, facing.angle(), 10.0 * delta)

	_anim_time  += delta
	_walk_cycle += delta * (spd / WALK_SPEED) * 8.0 if _is_moving else 0.0
	_bob         = sin(_walk_cycle) * (1.5 if _is_moving else 0.0)
	_animate(delta)

func set_external_move(vector: Vector2) -> void:
	external_move = vector.limit_length(1.0)

func set_path_visual(path: String) -> void:
	_path = path
	_recolor()

func visibility_factor() -> float:
	if in_shadow:    return 0.0
	if is_crouching: return 0.35
	return 1.0

# ── Build the full human character ────────────────────────────────
func _build_character() -> void:
	var is_spy := _path == "spy"
	var primary := Color.html("#00e5ff") if is_spy else Color.html("#ff3d00")
	var dark    := Color.html("#061829") if is_spy else Color.html("#180606")
	var suit    := Color.html("#0d2035") if is_spy else Color.html("#1a0a08")
	var accent  := Color.html("#39ff14")

	# ── 1. Ground shadow ──────────────────────────────────────────
	_shadow = _make_ellipse(10, 5, Color(0, 0, 0, 0.45), 14)
	_shadow.position = Vector2(0, 9)
	add_child(_shadow)

	# ── 2. Aura / detection indicator ────────────────────────────
	_aura = _make_ellipse(16, 14, Color(primary.r, primary.g, primary.b, 0.08), 16)
	_aura.position = Vector2(0, 0)
	add_child(_aura)

	# ── 3. Cape / cloak (spy only) ────────────────────────────────
	_cape = Polygon2D.new()
	_cape.name = "Cape"
	if is_spy:
		_cape.polygon = PackedVector2Array([
			Vector2(-8, -6), Vector2(8, -6),
			Vector2(11, 8), Vector2(-11, 8)
		])
		_cape.color = Color.html("#061829")
	else:
		_cape.polygon = PackedVector2Array([
			Vector2(-7, -4), Vector2(7, -4),
			Vector2(9, 6), Vector2(-9, 6)
		])
		_cape.color = Color.html("#180606")
	add_child(_cape)

	# ── 4. Left leg ───────────────────────────────────────────────
	_left_leg = Polygon2D.new()
	_left_leg.name = "LeftLeg"
	_left_leg.polygon = PackedVector2Array([
		Vector2(-5, 3), Vector2(-1, 3),
		Vector2(-1, 11), Vector2(-5, 11)
	])
	_left_leg.color = suit
	add_child(_left_leg)

	# ── 5. Right leg ──────────────────────────────────────────────
	_right_leg = Polygon2D.new()
	_right_leg.name = "RightLeg"
	_right_leg.polygon = PackedVector2Array([
		Vector2(1, 3), Vector2(5, 3),
		Vector2(5, 11), Vector2(1, 11)
	])
	_right_leg.color = suit
	add_child(_right_leg)

	# ── 6. Body / torso ───────────────────────────────────────────
	_body = Polygon2D.new()
	_body.name = "Body"
	_body.polygon = PackedVector2Array([
		Vector2(-6, -4), Vector2(6, -4),
		Vector2(8, 4), Vector2(-8, 4)
	])
	_body.color = suit
	add_child(_body)

	# ── 7. Chest plate / vest ─────────────────────────────────────
	var chest := Polygon2D.new()
	chest.name = "ChestPlate"
	chest.polygon = PackedVector2Array([
		Vector2(-4, -3), Vector2(4, -3),
		Vector2(5, 2), Vector2(-5, 2)
	])
	chest.color = Color(primary.r, primary.g, primary.b, 0.6)
	add_child(chest)

	# ── 8. Left arm ───────────────────────────────────────────────
	_left_arm = Polygon2D.new()
	_left_arm.name = "LeftArm"
	_left_arm.polygon = PackedVector2Array([
		Vector2(-9, -3), Vector2(-6, -3),
		Vector2(-7, 4), Vector2(-10, 4)
	])
	_left_arm.color = suit
	add_child(_left_arm)

	# ── 9. Right arm ──────────────────────────────────────────────
	_right_arm = Polygon2D.new()
	_right_arm.name = "RightArm"
	_right_arm.polygon = PackedVector2Array([
		Vector2(6, -3), Vector2(9, -3),
		Vector2(10, 4), Vector2(7, 4)
	])
	_right_arm.color = suit
	add_child(_right_arm)

	# ── 10. Weapon (spy: dart pistol / crime: knife) ──────────────
	_weapon = Polygon2D.new()
	_weapon.name = "Weapon"
	if is_spy:
		# Dart pistol — small L-shape at right hand
		_weapon.polygon = PackedVector2Array([
			Vector2(10, -1), Vector2(16, -1),
			Vector2(16, 1), Vector2(12, 1),
			Vector2(12, 3), Vector2(10, 3)
		])
		_weapon.color = Color.html("#304050")
	else:
		# Knife blade at right hand
		_weapon.polygon = PackedVector2Array([
			Vector2(10, -2), Vector2(16, -4),
			Vector2(17, -3), Vector2(11, 1)
		])
		_weapon.color = Color.html("#c0c8d0")
	add_child(_weapon)

	# ── 11. Neck ──────────────────────────────────────────────────
	var neck := Polygon2D.new()
	neck.name = "Neck"
	neck.polygon = PackedVector2Array([
		Vector2(-2, -6), Vector2(2, -6),
		Vector2(2, -3), Vector2(-2, -3)
	])
	neck.color = Color.html("#b08060")
	add_child(neck)

	# ── 12. Head ──────────────────────────────────────────────────
	_head = _make_ellipse(6, 7, Color.html("#b08060"), 12)
	_head.position = Vector2(0, -11)
	add_child(_head)

	# ── 13. Mask / helmet ─────────────────────────────────────────
	if is_spy:
		# Tactical balaclava — dark oval over lower head
		var mask := _make_ellipse(5, 4, dark, 10)
		mask.name = "Mask"
		mask.position = Vector2(0, -9)
		add_child(mask)
		# Tactical visor strip
		_visor = Polygon2D.new()
		_visor.name = "Visor"
		_visor.polygon = PackedVector2Array([
			Vector2(-5, -14), Vector2(5, -14),
			Vector2(5, -12), Vector2(-5, -12)
		])
		_visor.color = primary
		add_child(_visor)
	else:
		# Rin — hood / bandana
		var hood := _make_ellipse(6, 5, Color.html("#1a0a08"), 10)
		hood.name = "Hood"
		hood.position = Vector2(0, -12)
		add_child(hood)
		# Red bandana strip
		_visor = Polygon2D.new()
		_visor.name = "Bandana"
		_visor.polygon = PackedVector2Array([
			Vector2(-5, -10), Vector2(5, -10),
			Vector2(6, -8),  Vector2(-6, -8)
		])
		_visor.color = primary
		add_child(_visor)

	# ── 14. Eyes ──────────────────────────────────────────────────
	_eye_l = Polygon2D.new()
	_eye_l.name = "EyeL"
	_eye_l.polygon = PackedVector2Array([
		Vector2(-3, -13), Vector2(-1, -13),
		Vector2(-1, -12), Vector2(-3, -12)
	])
	_eye_l.color = primary
	add_child(_eye_l)

	_eye_r = Polygon2D.new()
	_eye_r.name = "EyeR"
	_eye_r.polygon = PackedVector2Array([
		Vector2(1, -13), Vector2(3, -13),
		Vector2(3, -12), Vector2(1, -12)
	])
	_eye_r.color = primary
	add_child(_eye_r)

	# ── 15. Cloak glow (spy active cloak effect) ──────────────────
	_cloak_glow = _make_ellipse(14, 12, Color(0, 0.9, 1, 0.0), 16)
	_cloak_glow.name = "CloakGlow"
	add_child(_cloak_glow)

func _add_shadow_light() -> void:
	# PointLight2D for character glow — spy=cyan, crime=red
	var light := PointLight2D.new()
	light.name = "CharLight"
	var is_spy := _path == "spy"
	light.color = Color.html("#00e5ff") if is_spy else Color.html("#ff3d00")
	light.energy = 0.35
	light.texture_scale = 0.4
	light.position = Vector2.ZERO
	add_child(light)

func _animate(delta: float) -> void:
	# Walking leg animation
	var leg_swing := sin(_walk_cycle) * 3.0
	if _left_leg:
		_left_leg.position.y = leg_swing
	if _right_leg:
		_right_leg.position.y = -leg_swing

	# Arm swing (opposite to legs)
	if _left_arm:
		_left_arm.position.y = -leg_swing * 0.7
	if _right_arm:
		_right_arm.position.y = leg_swing * 0.7

	# Body bob when walking
	if _body:
		_body.position.y = _bob * 0.4
	if _head:
		_head.position.y = -11 + _bob * 0.3

	# Crouch squash
	var squat := 0.72 if is_crouching else 1.0
	scale = Vector2(1.0, squat)

	# Shadow opacity
	if _shadow:
		_shadow.modulate.a = 1.0 if not in_shadow else 0.3

	# Aura pulse when moving
	if _aura:
		var pulse := 1.0 + sin(_anim_time * 3.0) * 0.08
		_aura.scale = Vector2.ONE * pulse
		_aura.modulate.a = 0.6 if _is_moving else 0.3

	# Visibility in shadow
	modulate.a = 0.45 if in_shadow else 1.0

	# Visor glow pulse
	if _visor:
		var glow_a := 0.7 + sin(_anim_time * 4.0) * 0.3
		_visor.modulate.a = glow_a

	# Eye blink
	var blink := 1.0 if fmod(_anim_time, 4.0) > 0.12 else 0.0
	if _eye_l: _eye_l.modulate.a = blink
	if _eye_r: _eye_r.modulate.a = blink

func _recolor() -> void:
	var is_spy  := _path == "spy"
	var primary := Color.html("#00e5ff") if is_spy else Color.html("#ff3d00")
	var suit    := Color.html("#0d2035") if is_spy else Color.html("#1a0a08")
	if _body:     _body.color     = suit
	if _visor:    _visor.color    = primary
	if _eye_l:    _eye_l.color    = primary
	if _eye_r:    _eye_r.color    = primary
	if _aura:
		_aura.color = Color(primary.r, primary.g, primary.b, 0.08)

func _read_input() -> Vector2:
	var v := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):  v.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): v.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):    v.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):  v.y += 1.0
	return v.normalized()

# ── Helper: build a smooth ellipse polygon ─────────────────────────
func _make_ellipse(rx: float, ry: float, color: Color, points: int = 12) -> Polygon2D:
	var p := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in points:
		var a := TAU * float(i) / float(points)
		pts.append(Vector2(cos(a) * rx, sin(a) * ry))
	p.polygon = pts
	p.color   = color
	return p
