extends Control

signal moved(vector: Vector2)

const RADIUS := 54.0

var base: Panel
var knob: Panel
var dragging := false

func _ready() -> void:
	custom_minimum_size = Vector2(136, 112)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_visuals()
	_reset_knob()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		dragging = event.pressed
		_update_from_position(event.position if dragging else size * 0.5)
	elif event is InputEventScreenDrag:
		dragging = true
		_update_from_position(event.position)
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging = event.pressed
		_update_from_position(event.position if dragging else size * 0.5)
	elif event is InputEventMouseMotion and dragging:
		_update_from_position(event.position)

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_reset_knob()

func _build_visuals() -> void:
	base = Panel.new()
	base.name = "StickBase"
	base.size = Vector2(RADIUS * 2.0, RADIUS * 2.0)
	base.position = Vector2(10, 2)
	base.add_theme_stylebox_override("panel", _circle_style(Color(0.16, 0.93, 1.0, 0.16), Color(0.49, 1.0, 0.95, 0.42), 2))
	add_child(base)

	knob = Panel.new()
	knob.name = "StickKnob"
	knob.size = Vector2(52, 52)
	knob.add_theme_stylebox_override("panel", _circle_style(Color(0.36, 1.0, 0.94, 0.28), Color(0.76, 1.0, 0.96, 0.72), 2))
	add_child(knob)

func _circle_style(fill: Color, border: Color, border_width: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.border_width_left = border_width
	style.border_width_right = border_width
	style.border_width_top = border_width
	style.border_width_bottom = border_width
	style.corner_radius_top_left = 999
	style.corner_radius_top_right = 999
	style.corner_radius_bottom_left = 999
	style.corner_radius_bottom_right = 999
	return style

func _update_from_position(local_position: Vector2) -> void:
	var center := _center()
	var offset := local_position - center
	var vector := offset / RADIUS
	if vector.length() > 1.0:
		vector = vector.normalized()

	knob.position = center + vector * RADIUS - knob.size * 0.5
	moved.emit(vector)

	if not dragging:
		_reset_knob()

func _reset_knob() -> void:
	if not knob:
		return
	knob.position = _center() - knob.size * 0.5
	moved.emit(Vector2.ZERO)

func _center() -> Vector2:
	return Vector2(10, 2) + Vector2(RADIUS, RADIUS)

