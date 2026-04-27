extends CharacterBody2D

const WALK_SPEED := 92.0
const CROUCH_SPEED := 48.0
const SPRINT_SPEED := 145.0

var external_move := Vector2.ZERO
var is_crouching := false
var in_shadow := false
var facing := Vector2.RIGHT
var body: Polygon2D
var aura: Polygon2D

func _ready() -> void:
	_build_visuals()

func _physics_process(delta: float) -> void:
	var input_vector := _read_keyboard_vector() + external_move
	if input_vector.length() > 1.0:
		input_vector = input_vector.normalized()

	is_crouching = Input.is_key_pressed(KEY_C)
	var speed := WALK_SPEED
	if is_crouching:
		speed = CROUCH_SPEED
	elif Input.is_key_pressed(KEY_SHIFT):
		speed = SPRINT_SPEED

	velocity = input_vector * speed
	move_and_slide()

	if input_vector.length() > 0.05:
		facing = input_vector.normalized()
		rotation = lerp_angle(rotation, facing.angle(), 12.0 * delta)
	_update_visuals()

func set_external_move(vector: Vector2) -> void:
	external_move = vector.limit_length(1.0)

func set_path_visual(path: String) -> void:
	var color := Color.html("#00e5ff") if path == "spy" else Color.html("#ff3d00")
	if body:
		body.color = color
	if aura:
		aura.color = Color(color.r, color.g, color.b, 0.16)

func visibility_factor() -> float:
	if in_shadow:
		return 0.0
	if is_crouching:
		return 0.4
	return 1.0

func _read_keyboard_vector() -> Vector2:
	var axis := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		axis.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		axis.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		axis.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		axis.y += 1.0
	return axis.normalized()

func _build_visuals() -> void:
	aura = Polygon2D.new()
	aura.name = "Aura"
	aura.polygon = PackedVector2Array([Vector2(-12, -12), Vector2(12, -12), Vector2(12, 12), Vector2(-12, 12)])
	aura.color = Color(0.0, 0.9, 1.0, 0.16)
	add_child(aura)

	body = Polygon2D.new()
	body.name = "Body"
	body.polygon = PackedVector2Array([Vector2(-7, -10), Vector2(9, -6), Vector2(9, 10), Vector2(-8, 10)])
	body.color = Color.html("#00e5ff")
	add_child(body)

func _update_visuals() -> void:
	scale = Vector2(1.0, 0.78) if is_crouching else Vector2.ONE
	modulate.a = 0.58 if in_shadow else 1.0
