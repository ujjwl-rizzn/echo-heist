## main.gd — VISUAL UPGRADE: Cinematic heist environments
## Replaces basic colored rectangles with detailed level art
extends Node2D

const PlayerAgentScript := preload("res://scripts/player_agent.gd")
const TouchStickScript  := preload("res://scripts/touch_stick.gd")
const GuardAIScript     := preload("res://entities/enemies/GuardAI.gd")
const LevelCatalog      := preload("res://resources/levels/level_catalog.gd")

var stage:     Node2D
var player:    CharacterBody2D
var ui:        CanvasLayer
var root_ui:   Control
var hud_label: Label
var hint_label:Label
var overlay:   PanelContainer
var overlay_text: Label
var button_box:VBoxContainer
var guards:    Array[Node2D] = []
var zones      := {}
var current_level_data := {}
var has_objective  := false
var vault_open     := false
var level_done     := false
var active_minigame:= ""
var minigame_step  := 0
var minigame_attempts := 0
var minigame_solution: Array[String] = []
var elapsed        := 0.0
var _screen_shake  := 0.0
var _particles:    Array[Node2D] = []

func _ready() -> void:
	randomize()
	RenderingServer.set_default_clear_color(Color.html("#020810"))
	DADS.initialize_from_save(SaveManager.load_local())
	GameState.load_from_save(SaveManager.load_local())
	_build_ui()
	_show_main_menu()

func _physics_process(delta: float) -> void:
	if level_done or active_minigame != "":
		return
	if stage:
		elapsed += delta
		_update_level(delta)
		_update_particles(delta)
		if _screen_shake > 0:
			_screen_shake -= delta * 8.0
			var shake := Vector2(randf_range(-2,2), randf_range(-2,2)) * _screen_shake
			stage.position = shake
		else:
			stage.position = Vector2.ZERO

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:        _show_pause()
		elif active_minigame == "":
			if event.keycode in [KEY_E, KEY_Q]: _interact()
			elif event.keycode == KEY_F:         _takedown(false)
			elif event.keycode == KEY_X:         _use_item()
			elif event.keycode == KEY_R:         _start_level(GameState.current_level)

# ── UI BUILD ───────────────────────────────────────────────────────
func _build_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	root_ui = Control.new()
	root_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui.add_child(root_ui)

	# HUD strip
	var hud_bg := ColorRect.new()
	hud_bg.color = Color(0.01, 0.04, 0.08, 0.88)
	hud_bg.position = Vector2(0, 0)
	hud_bg.size = Vector2(640, 22)
	root_ui.add_child(hud_bg)

	var hud_border := ColorRect.new()
	hud_border.color = Color.html("#00e5ff44")
	hud_border.position = Vector2(0, 21)
	hud_border.size = Vector2(640, 1)
	root_ui.add_child(hud_border)

	hud_label = Label.new()
	hud_label.position = Vector2(8, 4)
	hud_label.size     = Vector2(624, 18)
	hud_label.add_theme_font_size_override("font_size", 10)
	hud_label.add_theme_color_override("font_color", Color.html("#dffcff"))
	root_ui.add_child(hud_label)

	# Bottom hint strip
	var hint_bg := ColorRect.new()
	hint_bg.color = Color(0.01, 0.04, 0.08, 0.82)
	hint_bg.position = Vector2(0, 338)
	hint_bg.size = Vector2(640, 22)
	root_ui.add_child(hint_bg)

	var hint_border2 := ColorRect.new()
	hint_border2.color = Color.html("#00e5ff33")
	hint_border2.position = Vector2(0, 338)
	hint_border2.size = Vector2(640, 1)
	root_ui.add_child(hint_border2)

	hint_label = Label.new()
	hint_label.position = Vector2(8, 341)
	hint_label.size = Vector2(624, 18)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.add_theme_font_size_override("font_size", 10)
	hint_label.add_theme_color_override("font_color", Color.html("#a0d0e0"))
	root_ui.add_child(hint_label)

	# Overlay panel
	overlay = PanelContainer.new()
	overlay.position = Vector2(68, 42)
	overlay.size     = Vector2(504, 255)
	overlay.visible  = false
	overlay.add_theme_stylebox_override("panel",
		_panel_style(Color(0.01, 0.02, 0.05, 0.96), Color(0.0, 0.9, 1.0, 0.5)))
	root_ui.add_child(overlay)

	var stack := VBoxContainer.new()
	stack.name = "OverlayStack"
	stack.custom_minimum_size = Vector2(476, 222)
	stack.add_theme_constant_override("separation", 10)
	overlay.add_child(stack)

	overlay_text = Label.new()
	overlay_text.custom_minimum_size = Vector2(476, 132)
	overlay_text.add_theme_font_size_override("font_size", 12)
	overlay_text.add_theme_color_override("font_color", Color.html("#e8fbff"))
	overlay_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(overlay_text)

	button_box = VBoxContainer.new()
	button_box.name = "ButtonBox"
	button_box.custom_minimum_size = Vector2(476, 74)
	button_box.add_theme_constant_override("separation", 6)
	stack.add_child(button_box)

# ── MENUS ──────────────────────────────────────────────────────────
func _show_main_menu() -> void:
	_clear_stage()
	overlay.visible = true
	overlay_text.text = "ECHO HEIST\n\nTwo paths. Same city. One truth.\n\nPROTOCOL ECHO // Kael-7, sanctioned ghost operative.\nGHOST NETWORK // Rin, underground data phantom.\n\nChoose your path."
	_set_buttons([
		["PLAY SPY PATH",  func() -> void: _start_path(GameState.PATH_SPY)],
		["PLAY CRIME PATH",func() -> void: _start_path(GameState.PATH_CRIME)],
		["CONTINUE SAVE",  func() -> void: _continue_save()]
	])
	hud_label.text  = ""
	hint_label.text = "Steal the truth. Escape the city. Leave no clean answers."

func _start_path(path: String) -> void:
	GameState.new_run(path)
	DADS.initialize_from_save(SaveManager.load_local())
	_start_level(1)

func _continue_save() -> void:
	var data := SaveManager.load_local()
	if data.is_empty():
		_show_main_menu()
		hint_label.text = "No save found. Start a new run."
		return
	GameState.load_from_save(data)
	_start_level(GameState.current_level)

# ── LEVEL START ────────────────────────────────────────────────────
func _start_level(level_id: int) -> void:
	_clear_stage()
	overlay.visible = false
	_set_buttons([])
	GameState.begin_level(level_id)
	current_level_data = LevelCatalog.get_level(GameState.current_path, level_id)
	has_objective = false; vault_open = false; level_done = false
	active_minigame = ""; minigame_attempts = 0; elapsed = 0.0
	_build_stage()
	_build_player()
	_build_guards()
	_build_mobile_controls()
	_show_dialogue_intro()
	_update_hud()

# ── STAGE ART — COMPLETE VISUAL UPGRADE ───────────────────────────
func _build_stage() -> void:
	stage = Node2D.new()
	stage.name = "LevelStage"
	add_child(stage)

	var spy    := GameState.current_path == GameState.PATH_SPY
	var primary := Color.html("#00e5ff") if spy else Color.html("#ff3d00")
	var bg     := Color.html("#040e1a") if spy else Color.html("#100404")
	var wall_c := Color.html("#0a1e30") if spy else Color.html("#1a0808")
	var tile_c := Color.html("#061425") if spy else Color.html("#0e0505")
	var grid_c := Color(primary.r, primary.g, primary.b, 0.04)

	# ── Floor base ───────────────────────────────────────────────
	_add_rect(stage, "Floor", Rect2(28, 30, 584, 270), bg, Color.TRANSPARENT)

	# ── Floor tiles (grid) ───────────────────────────────────────
	var tile_size := 24
	for tx in range(28, 612, tile_size):
		for ty in range(30, 300, tile_size):
			var shade := Color(tile_c.r, tile_c.g, tile_c.b, 0.5 + randf() * 0.15)
			_add_rect(stage, "Tile", Rect2(tx+1, ty+1, tile_size-2, tile_size-2), shade, Color.TRANSPARENT)

	# ── Grid lines ───────────────────────────────────────────────
	for tx in range(28, 614, tile_size):
		_add_line(stage, Vector2(tx, 30), Vector2(tx, 300), grid_c)
	for ty in range(30, 302, tile_size):
		_add_line(stage, Vector2(28, ty), Vector2(612, ty), grid_c)

	# ── Walls ─────────────────────────────────────────────────────
	_add_rect(stage, "WallTop",   Rect2(28,  28, 584,  4), wall_c, primary.darkened(0.5))
	_add_rect(stage, "WallBot",   Rect2(28, 298, 584,  4), wall_c, primary.darkened(0.5))
	_add_rect(stage, "WallLeft",  Rect2(28,  28,  4, 274), wall_c, primary.darkened(0.5))
	_add_rect(stage, "WallRight", Rect2(608, 28,  4, 274), wall_c, primary.darkened(0.5))

	# ── Neon trim strips on walls ─────────────────────────────────
	_add_rect(stage, "TrimTop",   Rect2(28, 30, 584,  2), primary, Color.TRANSPARENT)
	_add_rect(stage, "TrimBot",   Rect2(28, 298, 584, 2), primary, Color.TRANSPARENT)

	# ── HACK ZONE — server rack cluster ──────────────────────────
	_build_server_rack_cluster(stage, Vector2(70, 78), primary, spy)
	# Hack zone floor marker
	_add_glowing_zone(stage, Rect2(52, 72, 130, 70), primary, 0.12, "HACK")

	# ── TARGET ZONE — vault/terminal ─────────────────────────────
	_build_target_terminal(stage, Vector2(290, 130), primary, spy)
	_add_glowing_zone(stage, Rect2(245, 82, 140, 104), Color.html("#e8f4f8"), 0.08, "TARGET")

	# ── EXIT ZONE — door/elevator ─────────────────────────────────
	_build_exit_door(stage, Vector2(536, 237), spy)
	_add_glowing_zone(stage, Rect2(492, 208, 100, 62), Color.html("#ff4060"), 0.15, "EXIT")

	# ── Shadow zones — dark corners ───────────────────────────────
	zones = {
		"hack":     Rect2(52,  72,  130, 70),
		"vault":    Rect2(245, 82,  140, 104),
		"exit":     Rect2(492, 208, 100, 62),
		"shadow_a": Rect2(36,  228,  80,  48),
		"shadow_b": Rect2(452, 68,   80,  40),
	}
	_add_shadow_zone(stage, zones["shadow_a"])
	_add_shadow_zone(stage, zones["shadow_b"])

	# ── Decorative pillars ────────────────────────────────────────
	_build_pillar(stage, Vector2(220, 60),  primary)
	_build_pillar(stage, Vector2(420, 60),  primary)
	_build_pillar(stage, Vector2(220, 270), primary)
	_build_pillar(stage, Vector2(420, 270), primary)

	# ── Security camera ───────────────────────────────────────────
	_build_camera(stage, Vector2(590, 45), primary)

	# ── Ceiling lights ────────────────────────────────────────────
	_build_ceiling_lights(stage, primary)

	# ── Ambient particles ─────────────────────────────────────────
	_spawn_ambient_particles(primary)

func _build_server_rack_cluster(parent: Node2D, origin: Vector2, color: Color, spy: bool) -> void:
	# Server rack cabinet
	for i in 3:
		var rack := Node2D.new()
		rack.position = origin + Vector2(i * 30, 8)
		parent.add_child(rack)
		# Cabinet body
		_add_rect(rack, "Cabinet", Rect2(-10,-22,20,44), Color.html("#0d1e2c"), Color(color.r,color.g,color.b,0.5))
		# LED strips
		for j in 4:
			var led := ColorRect.new()
			led.size = Vector2(14, 1)
			led.position = Vector2(-7, -18 + j * 10)
			led.color = Color(color.r, color.g, color.b, 0.5 + randf() * 0.4)
			rack.add_child(led)
		# Screen on middle rack
		if i == 1:
			_add_rect(rack, "Screen", Rect2(-7,-5,14,10), Color.html("#001830"), color)
			# Scanline on screen
			_add_rect(rack, "Scanline", Rect2(-7,-1,14,2), Color(color.r,color.g,color.b,0.4), Color.TRANSPARENT)

func _build_target_terminal(parent: Node2D, origin: Vector2, color: Color, spy: bool) -> void:
	# Main terminal body
	_add_rect_at(parent, "TermBase", origin + Vector2(-18, -8), 36, 28, Color.html("#0a1e30"), color)
	# Terminal screen
	_add_rect_at(parent, "Screen", origin + Vector2(-14, -4), 28, 16, Color.html("#001428"), Color(color.r,color.g,color.b,0.7))
	# Keypad
	for col in 3:
		for row in 2:
			_add_rect_at(parent, "Key", origin + Vector2(-8 + col*6, 12 + row*5), 4, 3, Color.html("#1a3040"), color)
	# Blinking cursor on screen
	_add_rect_at(parent, "Cursor", origin + Vector2(6,-3), 2, 3, color, Color.TRANSPARENT)
	# Data drive indicator
	var drive := Node2D.new()
	drive.position = origin + Vector2(0, -18)
	parent.add_child(drive)
	_add_rect(drive, "Drive", Rect2(-8,-5,16,10), Color.html("#ffd600"), Color(1,0.9,0,0.8))
	_add_rect(drive, "DriveLed", Rect2(4,-3,3,6), color, Color.TRANSPARENT)

func _build_exit_door(parent: Node2D, origin: Vector2, spy: bool) -> void:
	var door_c  := Color.html("#0d1e0d") if spy else Color.html("#1e0d0d")
	var frame_c := Color.html("#ff4060")
	# Door frame
	_add_rect_at(parent, "DoorFrame", origin + Vector2(-20,-28), 40, 56, door_c, frame_c)
	# Door panels
	_add_rect_at(parent, "PanelL", origin + Vector2(-18,-26), 16, 52, Color.html("#091810"), frame_c)
	_add_rect_at(parent, "PanelR", origin + Vector2(2,-26),   16, 52, Color.html("#091810"), frame_c)
	# Door gap / handle
	_add_rect_at(parent, "Gap", origin + Vector2(-2,-14), 4, 28, Color.html("#ff4060"), Color.TRANSPARENT)
	# Warning stripes on floor in front
	for i in 3:
		var stripe := ColorRect.new()
		stripe.size = Vector2(10, 3)
		stripe.position = origin + Vector2(-15 + i * 10, 28)
		stripe.color = Color(1, 0.25, 0.35, 0.5 if i % 2 == 0 else 0.15)
		parent.add_child(stripe)

func _build_pillar(parent: Node2D, pos: Vector2, color: Color) -> void:
	var p := Node2D.new()
	p.position = pos
	parent.add_child(p)
	_add_rect(p, "PillarBase", Rect2(-8,-8,16,16), Color.html("#0a1a28"), Color(color.r,color.g,color.b,0.4))
	_add_rect(p, "PillarCore", Rect2(-5,-5,10,10), Color.html("#061420"), Color.TRANSPARENT)
	# Neon dot on top
	_add_rect(p, "Dot", Rect2(-1,-1,2,2), color, Color.TRANSPARENT)

func _build_camera(parent: Node2D, pos: Vector2, color: Color) -> void:
	var cam := Node2D.new()
	cam.position = pos
	parent.add_child(cam)
	# Mount
	_add_rect(cam, "Mount", Rect2(-3,-4,6,4), Color.html("#1a2a3a"), Color.TRANSPARENT)
	# Camera body
	_add_rect(cam, "Body", Rect2(-6,0,12,8), Color.html("#0d1e2c"), color)
	# Lens
	_add_rect(cam, "Lens", Rect2(-2,2,4,4), Color.html("#001428"), Color(color.r,color.g,color.b,0.8))
	# Red LED
	_add_rect(cam, "LED", Rect2(5,1,2,2), Color.html("#ff0000"), Color.TRANSPARENT)

func _build_ceiling_lights(parent: Node2D, color: Color) -> void:
	var positions := [
		Vector2(140, 32), Vector2(280, 32), Vector2(420, 32), Vector2(560, 32),
		Vector2(200, 165), Vector2(400, 165)
	]
	for pos in positions:
		var light_node := Node2D.new()
		light_node.position = pos
		parent.add_child(light_node)
		# Light fixture
		_add_rect(light_node, "Fixture", Rect2(-16,0,32,4), Color.html("#1a3040"), Color(color.r,color.g,color.b,0.3))
		# Light cone downward
		var cone := Polygon2D.new()
		cone.name = "LightCone"
		cone.polygon = PackedVector2Array([
			Vector2(-12,4), Vector2(12,4), Vector2(28,70), Vector2(-28,70)
		])
		cone.color = Color(color.r, color.g, color.b, 0.04)
		light_node.add_child(cone)
		# PointLight2D
		var pl := PointLight2D.new()
		pl.color  = color
		pl.energy = 0.2
		pl.texture_scale = 0.6
		pl.position = Vector2(0, 6)
		light_node.add_child(pl)

func _spawn_ambient_particles(color: Color) -> void:
	# Floating dust/data particles
	for i in 12:
		var dot := ColorRect.new()
		dot.name  = "Particle" + str(i)
		dot.size  = Vector2(1,1)
		dot.color = Color(color.r, color.g, color.b, 0.4)
		dot.position = Vector2(randf_range(40, 600), randf_range(40, 290))
		stage.add_child(dot)
		_particles.append(dot)

func _update_particles(delta: float) -> void:
	for p in _particles:
		if not is_instance_valid(p): continue
		p.position.y -= delta * randf_range(4, 12)
		p.position.x += sin(Time.get_ticks_msec() * 0.001 + p.position.x) * delta * 3
		if p.position.y < 30:
			p.position.y = randf_range(270, 300)

func _add_glowing_zone(parent: Node2D, rect: Rect2, color: Color, alpha: float, label: String) -> void:
	# Zone fill
	_add_rect(parent, label + "Fill", rect,
		Color(color.r, color.g, color.b, alpha), Color(color.r, color.g, color.b, 0.6))
	# Corner markers
	var cx := [rect.position.x, rect.end.x - 6]
	var cy := [rect.position.y, rect.end.y - 6]
	for x in cx:
		for y in cy:
			_add_rect(parent, "Corner", Rect2(x, y, 6, 6), Color.TRANSPARENT,
				Color(color.r, color.g, color.b, 0.9))
	# Label
	_add_world_label(parent, label, rect.position + Vector2(4, -12), color)

func _add_shadow_zone(parent: Node2D, rect: Rect2) -> void:
	_add_rect(parent, "Shadow", rect, Color(0,0,0,0.6), Color.TRANSPARENT)

# ── HELPER DRAW FUNCTIONS ──────────────────────────────────────────
func _add_rect(parent: Node2D, n: String, rect: Rect2, fill: Color, border: Color) -> void:
	if fill != Color.TRANSPARENT:
		var f := ColorRect.new()
		f.name  = n + "Fill"
		f.size  = rect.size
		f.position = rect.position
		f.color = fill
		parent.add_child(f)
	if border != Color.TRANSPARENT:
		var line_data := [
			[rect.position, Vector2(rect.end.x, rect.position.y)],
			[Vector2(rect.end.x, rect.position.y), rect.end],
			[rect.end, Vector2(rect.position.x, rect.end.y)],
			[Vector2(rect.position.x, rect.end.y), rect.position]
		]
		for seg in line_data:
			_add_line(parent, seg[0], seg[1], border)

func _add_rect_at(parent: Node2D, n: String, pos: Vector2, w: float, h: float,
				  fill: Color, border: Color) -> void:
	_add_rect(parent, n, Rect2(pos, Vector2(w, h)), fill, border)

func _add_line(parent: Node2D, from: Vector2, to: Vector2, color: Color) -> void:
	var ln := Line2D.new()
	ln.default_color = color
	ln.width = 1.0
	ln.add_point(from)
	ln.add_point(to)
	parent.add_child(ln)

func _add_world_label(parent: Node2D, text: String, pos: Vector2, color: Color) -> void:
	var lbl := Label.new()
	lbl.text     = text
	lbl.position = pos
	lbl.add_theme_font_size_override("font_size", 9)
	lbl.add_theme_color_override("font_color", color)
	parent.add_child(lbl)

# ── PLAYER + GUARDS ────────────────────────────────────────────────
func _build_player() -> void:
	player = PlayerAgentScript.new()
	player.name = "Player"
	player.global_position = Vector2(58, 262)
	player.set_path_visual(GameState.current_path)
	add_child(player)

func _build_guards() -> void:
	guards.clear()
	var spy        := GameState.current_path == GameState.PATH_SPY
	var guard_color := Color.html("#ffd166") if spy else Color.html("#39ff14")
	var count := 2 + int(GameState.current_level / 3)
	if DADS.should_spawn_extra_guard(): count += 1

	for i in range(count):
		var guard = GuardAIScript.new()
		guard.name = "Guard" + str(i + 1)
		var y  := 96.0 + float(i % 3) * 62.0
		var p1 := Vector2(205 + i * 28, y)
		var p2 := Vector2(470 - i * 18, y + 28.0)
		stage.add_child(guard)
		guard.setup([p1, p2], player, guard_color)
		guard.backup_requested.connect(_on_backup_requested)
		guards.append(guard)

# ── MOBILE CONTROLS ────────────────────────────────────────────────
func _build_mobile_controls() -> void:
	if not DisplayServer.is_touchscreen_available() and OS.get_name() not in ["Android","iOS"]:
		return
	var ctrl_layer := CanvasLayer.new()
	ctrl_layer.layer = 3
	add_child(ctrl_layer)

	var ctrl := Control.new()
	ctrl.set_anchors_preset(Control.PRESET_FULL_RECT)
	ctrl_layer.add_child(ctrl)

	# D-pad background
	var dpad_bg := Panel.new()
	dpad_bg.size = Vector2(120, 120)
	dpad_bg.position = Vector2(12, 216)
	dpad_bg.add_theme_stylebox_override("panel",
		_circle_style(Color(0, 0.5, 0.6, 0.15), Color(0, 0.9, 1, 0.4), 1))
	ctrl.add_child(dpad_bg)

	# Stick
	var stick := TouchStickScript.new()
	stick.position = Vector2(12, 216)
	stick.moved.connect(func(v): player.set_external_move(v) if player else null)
	ctrl.add_child(stick)

	# Action buttons
	var btn_data := [
		["ACT",  Vector2(506, 286), Color.html("#00e5ff")],
		["TAKE", Vector2(450, 286), Color.html("#39ff14")],
		["ITEM", Vector2(506, 244), Color.html("#ffd600")],
	]
	for bd in btn_data:
		var btn := _make_action_btn(bd[0], bd[1], bd[2])
		ctrl.add_child(btn)
		match bd[0]:
			"ACT":  btn.pressed.connect(_interact)
			"TAKE": btn.pressed.connect(func(): _takedown(false))
			"ITEM": btn.pressed.connect(_use_item)

func _make_action_btn(label: String, pos: Vector2, color: Color) -> Button:
	var btn := Button.new()
	btn.text = label
	btn.size = Vector2(50, 34)
	btn.position = pos
	var s := StyleBoxFlat.new()
	s.bg_color     = Color(color.r, color.g, color.b, 0.18)
	s.border_color = color
	for side in [SIDE_LEFT, SIDE_RIGHT, SIDE_TOP, SIDE_BOTTOM]:
		s.set_border_width(side, 1)
	s.corner_radius_top_left = 4; s.corner_radius_top_right = 4
	s.corner_radius_bottom_left = 4; s.corner_radius_bottom_right = 4
	btn.add_theme_stylebox_override("normal", s)
	btn.add_theme_color_override("font_color", color)
	btn.add_theme_font_size_override("font_size", 10)
	return btn

# ── GAMEPLAY LOOP ──────────────────────────────────────────────────
func _update_level(delta: float) -> void:
	if not player: return
	var awareness := _highest_awareness()
	GameState.current_awareness = awareness
	AudioManager.update_music(awareness, GameState.current_heat)
	if player.in_shadow != _player_in_shadow():
		player.in_shadow = _player_in_shadow()
	_update_hud()
	# Check death
	if GameState.health <= 0 and not level_done:
		_fail_level("HP reached zero")

func _show_dialogue_intro() -> void:
	var obj := str(current_level_data.get("objective","Extract the data."))
	var lvl := str(current_level_data.get("name",""))
	var speaker := "Director NOVA" if GameState.current_path == GameState.PATH_SPY else "The Broker"
	hint_label.text = speaker + ": " + obj
	await get_tree().create_timer(4.0).timeout
	if hint_label:
		hint_label.text = "WASD/stick = move  |  F = takedown  |  E = interact  |  X = item"

func _interact() -> void:
	if not player or active_minigame != "": return
	var pos := player.global_position
	if zones["hack"].has_point(pos):
		_start_minigame(str(current_level_data.get("minigame","neural_decrypt")))
	elif zones["vault"].has_point(pos):
		if not vault_open:
			hint_label.text = "Vault locked. Solve the hack mini-game first."
		else:
			has_objective = true
			GameState.complete_objective("data_stolen", 450)
			AudioManager.play_sfx("score")
			_shake_screen(0.4)
			hint_label.text = "Data extracted. Reach the EXIT zone."
	elif zones["exit"].has_point(pos):
		if has_objective: _complete_level()
		else: hint_label.text = "You need the data before extraction."
	else:
		hint_label.text = "Move to HACK, TARGET, or EXIT zone."

func _start_minigame(game_type: String) -> void:
	active_minigame = game_type
	minigame_step   = 0
	minigame_attempts = 0
	minigame_solution = _solution_for_minigame(game_type)
	overlay.visible = true
	overlay_text.text = _minigame_title(game_type) + "\n\nChoose the correct sequence.\nTier: " + DADS.current_tier.to_upper()
	EventBus.minigame_started.emit(game_type)
	_set_minigame_buttons()

func _set_minigame_buttons() -> void:
	_set_buttons([])
	for option in ["TRACE", "SPLICE", "SYNC", "BYPASS"]:
		var btn := Button.new()
		btn.text = option
		btn.custom_minimum_size = Vector2(112, 34)
		var oc: String = option
		btn.pressed.connect(func(): _minigame_pick(oc))
		overlay.add_child(btn)

func _minigame_pick(option: String) -> void:
	if active_minigame == "": return
	if option == minigame_solution[minigame_step]:
		minigame_step += 1
		AudioManager.play_sfx("hack")
		overlay_text.text = _minigame_title(active_minigame) + "\n\nStep " + str(minigame_step) + "/" + str(minigame_solution.size()) + " correct."
		if minigame_step >= minigame_solution.size():
			_minigame_success()
	else:
		minigame_attempts += 1
		GameState.minigame_fails += 1
		GameState.register_alert(0.4)
		AudioManager.play_sfx("fail")
		overlay_text.text = _minigame_title(active_minigame) + "\n\nWrong. Alarm raised. Try again."
		minigame_step = 0
		_shake_screen(0.5)

func _minigame_success() -> void:
	EventBus.minigame_succeeded.emit(active_minigame, minigame_attempts)
	vault_open = true
	GameState.complete_objective(active_minigame, 300)
	active_minigame = ""
	overlay.visible = false
	_set_buttons([])
	hint_label.text = "Vault open. Move to TARGET to steal the data."
	_shake_screen(0.2)

func _takedown(lethal: bool) -> void:
	if active_minigame != "" or not player: return
	var closest: Node2D = null
	var best := 9999.0
	for guard in guards:
		if not is_instance_valid(guard) or guard.disabled: continue
		var d := player.global_position.distance_to(guard.global_position)
		if d < best: best = d; closest = guard
	if closest and best <= 38.0:
		var is_lethal := lethal or GameState.current_path == GameState.PATH_CRIME
		closest.takedown(is_lethal)
		if is_lethal:
			GameState.kill_count += 1
			GameState.register_alert(0.5)
			GameState.add_score(80, "assassin")
		else:
			GameState.add_score(120, "ghost_takedown")
		AudioManager.play_sfx("takedown")
		_shake_screen(0.3)
	else:
		hint_label.text = "No guard close enough. Get within range first."

func _use_item() -> void:
	if GameState.current_path == GameState.PATH_SPY:
		vault_open = true
		GameState.add_score(80, "emp")
		hint_label.text = "EMP fired. Vault bypassed."
	else:
		GameState.current_heat = maxf(0.0, GameState.current_heat - 0.25)
		GameState.add_score(80, "smoke")
		hint_label.text = "Smoke deployed. Heat dropped."
	AudioManager.play_sfx("hack")

func _complete_level() -> void:
	level_done = true
	var time_ms := int(elapsed * 1000.0)
	var result  := ScoreManager.calculate_level({
		"kills": GameState.kill_count,
		"alerts": GameState.alert_count,
		"bodies_found": GameState.bodies_found,
		"minigame_fails": GameState.minigame_fails,
		"secrets": GameState.secrets_found,
		"time_ms": time_ms,
		"par_ms": int(current_level_data.get("par", 240000))
	})
	var score := int(result["score"])
	var rank  := str(result["rank"])
	GameState.add_score(score, "level_" + str(GameState.current_level) + "_" + rank)
	GameState.add_credits(max(100, int(score / 2)))
	ItemManager.try_rank_unlock(GameState.current_level, rank)
	_apply_story_flags()
	SaveManager.auto_save()
	EventBus.level_completed.emit(score, rank)
	AudioManager.play_sfx("score")
	if GameState.current_level >= 10:
		_show_ending()
	else:
		overlay.visible = true
		overlay_text.text = "LEVEL COMPLETE\n\n" + str(current_level_data.get("name","")) + \
			"\nRank: " + rank + "  |  Score: " + str(score) + "  |  Credits: " + str(GameState.credits) + \
			"\n\nNext: Level " + str(GameState.current_level + 1)
		_set_buttons([
			["NEXT LEVEL", func(): _start_level(GameState.current_level + 1)],
			["MAIN MENU",  _show_main_menu]
		])

func _fail_level(reason: String) -> void:
	level_done = true
	EventBus.level_failed.emit(reason)
	overlay.visible = true
	overlay_text.text = "MISSION FAILED\n\n" + reason + "\n\nThe city learned your rhythm. Route cleaner."
	AudioManager.play_sfx("fail")
	_shake_screen(1.0)
	_set_buttons([
		["RETRY",     func(): _start_level(GameState.current_level)],
		["MAIN MENU", _show_main_menu]
	])

func _show_ending() -> void:
	overlay.visible = true
	overlay_text.text = StoryManager.ending_title() + "\n\n" + StoryManager.ending_text() + \
		"\n\nFinal Score: " + str(GameState.session_score)
	_set_buttons([["NEW RUN", _show_main_menu]])

func _show_pause() -> void:
	if active_minigame != "": return
	overlay.visible = not overlay.visible
	if overlay.visible:
		overlay_text.text = "PAUSED"
		_set_buttons([
			["RESUME",  _show_pause],
			["RESTART", func(): _start_level(GameState.current_level)]
		])
	else:
		_set_buttons([])

# ── HUD ────────────────────────────────────────────────────────────
func _update_hud() -> void:
	if not hud_label: return
	var p    := "SPY" if GameState.current_path == GameState.PATH_SPY else "CRIME"
	var lvl  := str(GameState.current_level)
	var name := str(current_level_data.get("name",""))
	var hp   := str(GameState.health)
	var al   := str(GameState.alert_count) + "/" + str(DADS.get_max_alerts())
	var sc   := str(GameState.session_score)
	var tier := DADS.current_tier.to_upper()
	var aw   := int(GameState.current_awareness * 100)
	hud_label.text = "ECHO HEIST // " + p + " // L" + lvl + " " + name + \
		" // HP " + hp + " // ALERTS " + al + " // SCORE " + sc + \
		" // AWR " + str(aw) + "% // " + tier

# ── HELPERS ────────────────────────────────────────────────────────
func _shake_screen(intensity: float) -> void:
	_screen_shake = clampf(_screen_shake + intensity, 0.0, 1.5)

func _highest_awareness() -> float:
	var h := 0.0
	for guard in guards:
		if is_instance_valid(guard): h = maxf(h, guard.awareness)
	return h

func _player_in_shadow() -> bool:
	if not player: return false
	var pos := player.global_position
	return zones.has("shadow_a") and (zones["shadow_a"].has_point(pos) or zones["shadow_b"].has_point(pos))

func _apply_story_flags() -> void:
	var lv := GameState.current_level
	if GameState.current_path == GameState.PATH_SPY:
		match lv:
			1: GameState.set_flag("saw_extra_data",    true)
			2: GameState.set_flag("saw_own_file",      true)
			5: GameState.set_flag("found_own_origin",  true)
			6: GameState.set_flag("server_choice",     "copy_destroy")
			8: GameState.set_flag("took_master_key",   true)
	else:
		match lv:
			1: GameState.set_flag("heard_market_message", true)
			2: GameState.set_flag("found_echo_ref",    true)
			4: GameState.set_flag("saw_nova_donor",    true)
			5: GameState.set_flag("lot7_found",        true)
			6: GameState.set_flag("vanta_choice",      "expose")
			6: GameState.set_flag("sparks_status",     "ally")
			8: GameState.set_flag("nova_is_vanta",     true)

func _on_backup_requested(origin: Vector2, caller: Node2D) -> void:
	for guard in guards:
		if guard != caller and not guard.disabled:
			guard.last_known_pos = origin
			guard.awareness = maxf(guard.awareness, 0.65)
			return

func _solution_for_minigame(game_type: String) -> Array[String]:
	match game_type:
		"neural_decrypt": return ["TRACE","SYNC","BYPASS"]
		"safecrack":      return ["SYNC","TRACE","SYNC"]
		"pickpocket":     return ["TRACE","TRACE","BYPASS"]
		"wire_splice":    return ["SPLICE","TRACE","BYPASS"]
		"signal_trace":   return ["SYNC","SPLICE","SYNC"]
		"bribe_dialogue": return ["BYPASS","TRACE","SYNC"]
		"coop_hack":      return ["TRACE","SPLICE","SYNC","BYPASS"]
	return ["TRACE","SYNC"]

func _minigame_title(game_type: String) -> String:
	match game_type:
		"neural_decrypt": return "NEURAL DECRYPT"
		"safecrack":      return "SAFECRACK AUDIO"
		"pickpocket":     return "PICKPOCKET RHYTHM"
		"wire_splice":    return "WIRE SPLICE"
		"signal_trace":   return "SIGNAL TRACE"
		"bribe_dialogue": return "BRIBE DIALOGUE"
		"coop_hack":      return "CO-OP HACK"
	return "MINI-GAME"

func _set_buttons(items: Array) -> void:
	for child in button_box.get_children(): child.queue_free()
	for child in overlay.get_children():
		if child is Button: child.queue_free()
	for item in items:
		var btn := Button.new()
		btn.text = str(item[0])
		btn.custom_minimum_size = Vector2(460, 30)
		btn.pressed.connect(item[1])
		btn.add_theme_stylebox_override("normal",
			_panel_style(Color(0.02, 0.06, 0.10, 0.85), Color(0, 0.9, 1, 0.6)))
		btn.add_theme_color_override("font_color", Color.html("#dffcff"))
		btn.add_theme_font_size_override("font_size", 12)
		button_box.add_child(btn)

func _clear_stage() -> void:
	if stage:  stage.queue_free()
	if player: player.queue_free()
	for guard in guards:
		if is_instance_valid(guard): guard.queue_free()
	guards.clear()
	_particles.clear()
	for child in root_ui.get_children():
		if child != hud_label and child != hint_label and child != overlay:
			child.queue_free()

func _panel_style(fill: Color, border: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = fill
	s.border_color = border
	for side in [SIDE_LEFT, SIDE_RIGHT, SIDE_TOP, SIDE_BOTTOM]:
		s.set_border_width(side, 1)
	s.corner_radius_top_left    = 3; s.corner_radius_top_right    = 3
	s.corner_radius_bottom_left = 3; s.corner_radius_bottom_right = 3
	s.content_margin_left = 14; s.content_margin_top  = 10
	s.content_margin_right= 14; s.content_margin_bottom = 10
	return s

func _circle_style(fill: Color, border: Color, bw: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color     = fill
	s.border_color = border
	for side in [SIDE_LEFT, SIDE_RIGHT, SIDE_TOP, SIDE_BOTTOM]:
		s.set_border_width(side, bw)
	for corner in [CORNER_TOP_LEFT, CORNER_TOP_RIGHT, CORNER_BOTTOM_LEFT, CORNER_BOTTOM_RIGHT]:
		s.set_corner_radius(corner, 999)
	return s
