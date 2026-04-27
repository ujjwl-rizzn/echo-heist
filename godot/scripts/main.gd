extends Node2D

const PlayerAgentScript := preload("res://scripts/player_agent.gd")
const TouchStickScript := preload("res://scripts/touch_stick.gd")
const GuardAIScript := preload("res://entities/enemies/GuardAI.gd")
const LevelCatalog := preload("res://resources/levels/level_catalog.gd")

var stage: Node2D
var player: CharacterBody2D
var ui: CanvasLayer
var root_ui: Control
var hud_label: Label
var hint_label: Label
var overlay: PanelContainer
var overlay_text: Label
var button_box: VBoxContainer
var guards: Array[Node2D] = []
var zones := {}
var current_level_data := {}
var has_objective := false
var vault_open := false
var level_done := false
var active_minigame := ""
var minigame_step := 0
var minigame_attempts := 0
var minigame_solution: Array[String] = []
var elapsed := 0.0

func _ready() -> void:
	randomize()
	RenderingServer.set_default_clear_color(Color.html("#050a0f"))
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

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			_show_pause()
		elif active_minigame == "":
			if event.keycode == KEY_E or event.keycode == KEY_Q:
				_interact()
			elif event.keycode == KEY_F:
				_takedown(false)
			elif event.keycode == KEY_X:
				_use_item()
			elif event.keycode == KEY_R:
				_start_level(GameState.current_level)

func _build_ui() -> void:
	ui = CanvasLayer.new()
	add_child(ui)
	root_ui = Control.new()
	root_ui.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui.add_child(root_ui)

	hud_label = Label.new()
	hud_label.position = Vector2(8, 7)
	hud_label.size = Vector2(624, 48)
	hud_label.add_theme_font_size_override("font_size", 10)
	hud_label.add_theme_color_override("font_color", Color.html("#dffcff"))
	root_ui.add_child(hud_label)

	hint_label = Label.new()
	hint_label.position = Vector2(8, 305)
	hint_label.size = Vector2(624, 42)
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_label.add_theme_font_size_override("font_size", 12)
	hint_label.add_theme_color_override("font_color", Color.html("#dffcff"))
	hint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root_ui.add_child(hint_label)

	overlay = PanelContainer.new()
	overlay.position = Vector2(68, 42)
	overlay.size = Vector2(504, 255)
	overlay.visible = false
	overlay.add_theme_stylebox_override("panel", _panel_style(Color(0.01, 0.02, 0.04, 0.94), Color(0.0, 0.9, 1.0, 0.5)))
	root_ui.add_child(overlay)

	var overlay_stack := VBoxContainer.new()
	overlay_stack.name = "OverlayStack"
	overlay_stack.custom_minimum_size = Vector2(476, 222)
	overlay_stack.add_theme_constant_override("separation", 10)
	overlay.add_child(overlay_stack)

	overlay_text = Label.new()
	overlay_text.custom_minimum_size = Vector2(476, 132)
	overlay_text.add_theme_font_size_override("font_size", 12)
	overlay_text.add_theme_color_override("font_color", Color.html("#e8fbff"))
	overlay_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	overlay_stack.add_child(overlay_text)

	button_box = VBoxContainer.new()
	button_box.name = "ButtonBox"
	button_box.custom_minimum_size = Vector2(476, 74)
	button_box.add_theme_constant_override("separation", 6)
	overlay_stack.add_child(button_box)

func _show_main_menu() -> void:
	_clear_stage()
	overlay.visible = true
	overlay_text.text = "ECHO HEIST\n\nTwo paths. Same city. One truth.\n\nPROTOCOL ECHO // Kael-7, sanctioned ghost operative.\nGHOST NETWORK // Rin, underground data phantom.\n\nChoose your path."
	_set_buttons([
		["PLAY SPY PATH", func() -> void: _start_path(GameState.PATH_SPY)],
		["PLAY CRIME PATH", func() -> void: _start_path(GameState.PATH_CRIME)],
		["CONTINUE SAVE", func() -> void: _continue_save()]
	])
	hud_label.text = ""
	hint_label.text = "Steal the truth. Escape the city. Leave no clean answers."

func _start_path(path: String) -> void:
	GameState.new_run(path)
	DADS.initialize_from_save(SaveManager.load_local())
	_start_level(1)

func _continue_save() -> void:
	var data := SaveManager.load_local()
	if data.is_empty():
		_show_main_menu()
		hint_label.text = "No save found yet. Start Spy or Crime."
		return
	GameState.load_from_save(data)
	_start_level(GameState.current_level)

func _start_level(level_id: int) -> void:
	_clear_stage()
	overlay.visible = false
	_set_buttons([])
	GameState.begin_level(level_id)
	current_level_data = LevelCatalog.get_level(GameState.current_path, level_id)
	has_objective = false
	vault_open = false
	level_done = false
	active_minigame = ""
	minigame_attempts = 0
	elapsed = 0.0
	_build_stage()
	_build_player()
	_build_guards()
	_build_mobile_controls()
	_show_dialogue_intro()
	_update_hud()

func _build_stage() -> void:
	stage = Node2D.new()
	stage.name = "LevelStage"
	add_child(stage)

	var spy := GameState.current_path == GameState.PATH_SPY
	var base := Color.html("#061829") if spy else Color.html("#150908")
	var accent := Color.html("#00e5ff") if spy else Color.html("#ff3d00")
	_add_rect("Floor", Rect2(28, 58, 584, 235), base, Color.html("#1a3040"))
	_add_rect("ShadowA", Rect2(52, 224, 92, 48), Color(0, 0, 0, 0.55), accent)
	_add_rect("ShadowB", Rect2(455, 76, 106, 42), Color(0, 0, 0, 0.5), accent)
	_add_rect("HackZone", Rect2(70, 78, 115, 58), Color(accent.r, accent.g, accent.b, 0.16), accent)
	_add_rect("VaultZone", Rect2(265, 88, 124, 88), Color(0.9, 0.95, 1.0, 0.1), Color.html("#e8f4f8"))
	_add_rect("ExitZone", Rect2(495, 210, 82, 55), Color(0.95, 0.1, 0.24, 0.18), Color.html("#ff4060"))
	zones = {
		"hack": Rect2(70, 78, 115, 58),
		"vault": Rect2(265, 88, 124, 88),
		"exit": Rect2(495, 210, 82, 55),
		"shadow_a": Rect2(52, 224, 92, 48),
		"shadow_b": Rect2(455, 76, 106, 42)
	}
	_add_world_label("HACK", Vector2(84, 61), accent)
	_add_world_label("TARGET", Vector2(286, 70), Color.html("#e8f4f8"))
	_add_world_label("EXIT", Vector2(514, 194), Color.html("#ff4060"))

func _build_player() -> void:
	player = PlayerAgentScript.new()
	player.name = "Player"
	player.global_position = Vector2(58, 262)
	player.set_path_visual(GameState.current_path)
	add_child(player)

func _build_guards() -> void:
	guards.clear()
	var guard_color := Color.html("#ffd166") if GameState.current_path == GameState.PATH_SPY else Color.html("#39ff14")
	var count := 2 + int(GameState.current_level / 3)
	if DADS.should_spawn_extra_guard():
		count += 1
	for i in range(count):
		var guard = GuardAIScript.new()
		guard.name = "Guard" + str(i + 1)
		var y := 96.0 + float(i % 3) * 62.0
		var p1 := Vector2(205 + i * 28, y)
		var p2 := Vector2(470 - i * 18, y + 28.0)
		stage.add_child(guard)
		guard.setup([p1, p2], player, guard_color)
		guard.backup_requested.connect(_on_backup_requested)
		guards.append(guard)

func _build_mobile_controls() -> void:
	var stick := TouchStickScript.new()
	stick.name = "VirtualStick"
	stick.position = Vector2(14, 222)
	stick.moved.connect(func(v: Vector2) -> void:
		if player and player.has_method("set_external_move"):
			player.set_external_move(v)
	)
	root_ui.add_child(stick)
	var actions := [
		["ACT", Vector2(510, 255), _interact],
		["TAKE", Vector2(440, 255), func() -> void: _takedown(false)],
		["ITEM", Vector2(370, 255), _use_item]
	]
	for item in actions:
		var button := Button.new()
		button.text = item[0]
		button.position = item[1]
		button.size = Vector2(60, 44)
		var action_callback: Callable = item[2]
		button.pressed.connect(action_callback)
		root_ui.add_child(button)

func _show_dialogue_intro() -> void:
	var who := "Director NOVA" if GameState.current_path == GameState.PATH_SPY else "The Broker"
	var line := "Stay clean, Kael-7." if GameState.current_path == GameState.PATH_SPY else "Get paid, Rin. Then vanish."
	hint_label.text = who + ": " + line + " // " + str(current_level_data.get("objective", ""))

func _update_level(_delta: float) -> void:
	player.in_shadow = _player_in_shadow()
	GameState.current_awareness = _highest_awareness()
	GameState.current_heat = clampf(float(GameState.alert_count) / 3.0, 0.0, 1.0)
	AudioManager.update_music(GameState.current_awareness, GameState.current_heat)
	if GameState.current_path == GameState.PATH_SPY and GameState.alert_count >= int(DADS.tier_data.get("alerts", 2)) + 1:
		_fail_level("Spy protocol blown: too many full alerts.")
	if GameState.health <= 0:
		_fail_level("Operative down.")
	_update_hud()

func _interact() -> void:
	if not player or active_minigame != "":
		return
	var pos := player.global_position
	if zones["hack"].has_point(pos):
		_start_minigame(str(current_level_data.get("minigame", "neural_decrypt")))
	elif zones["vault"].has_point(pos):
		if not vault_open:
			hint_label.text = "Target is locked. Solve the mini-game in the hack zone first."
		else:
			has_objective = true
			GameState.complete_objective("data_stolen", 450)
			AudioManager.play_sfx("score")
			hint_label.text = "Data stolen. Reach the exit zone."
	elif zones["exit"].has_point(pos):
		if has_objective:
			_complete_level()
		else:
			hint_label.text = "You need the data before extraction."
	else:
		hint_label.text = "Move to HACK, TARGET, or EXIT. C crouches. F takedown. X item."

func _start_minigame(game_type: String) -> void:
	active_minigame = game_type
	minigame_step = 0
	minigame_attempts = 0
	minigame_solution = _solution_for_minigame(game_type)
	overlay.visible = true
	overlay_text.text = _minigame_title(game_type) + "\n\nChoose the correct sequence.\nDADS tier: " + DADS.current_tier
	EventBus.minigame_started.emit(game_type)
	_set_minigame_buttons()

func _set_minigame_buttons() -> void:
	var options := ["TRACE", "SPLICE", "SYNC", "BYPASS"]
	_set_buttons([])
	for option in options:
		var button := Button.new()
		button.text = option
		button.custom_minimum_size = Vector2(112, 34)
		var option_copy: String = option
		button.pressed.connect(func() -> void: _minigame_pick(option_copy))
		overlay.add_child(button)

func _minigame_pick(option: String) -> void:
	if active_minigame == "":
		return
	if option == minigame_solution[minigame_step]:
		minigame_step += 1
		AudioManager.play_sfx("hack")
		overlay_text.text = _minigame_title(active_minigame) + "\n\nStep " + str(minigame_step) + "/" + str(minigame_solution.size()) + " clean."
		if minigame_step >= minigame_solution.size():
			_minigame_success()
	else:
		minigame_attempts += 1
		GameState.minigame_fails += 1
		GameState.register_alert(0.4)
		AudioManager.play_sfx("fail")
		overlay_text.text = _minigame_title(active_minigame) + "\n\nWrong input. Partial alarm raised. Try again."
		minigame_step = 0

func _minigame_success() -> void:
	EventBus.minigame_succeeded.emit(active_minigame, minigame_attempts)
	vault_open = true
	GameState.complete_objective(active_minigame, 300)
	active_minigame = ""
	overlay.visible = false
	_set_buttons([])
	hint_label.text = "Mini-game solved. Target vault is open."

func _takedown(lethal: bool) -> void:
	if active_minigame != "" or not player:
		return
	var closest: Node2D = null
	var best := 9999.0
	for guard in guards:
		if not is_instance_valid(guard) or guard.disabled:
			continue
		var distance := player.global_position.distance_to(guard.global_position)
		if distance < best:
			best = distance
			closest = guard
	if closest and best <= 34.0:
		var is_lethal := lethal or GameState.current_path == GameState.PATH_CRIME
		closest.takedown(is_lethal)
		if is_lethal:
			GameState.kill_count += 1
			GameState.register_alert(0.5)
			GameState.add_score(80, "assassin")
		else:
			GameState.add_score(120, "ghost_takedown")
		AudioManager.play_sfx("takedown")
	else:
		hint_label.text = "No guard close enough for takedown."

func _use_item() -> void:
	if GameState.current_path == GameState.PATH_SPY:
		vault_open = true
		GameState.add_score(80, "emp")
		hint_label.text = "EMP pulse fired. Vault security is bypassed for this prototype."
	else:
		GameState.current_heat = maxf(0.0, GameState.current_heat - 0.25)
		GameState.add_score(80, "smoke")
		hint_label.text = "Smoke bomb used. Heat drops and guards lose rhythm."
	AudioManager.play_sfx("hack")

func _complete_level() -> void:
	level_done = true
	var time_ms := int(elapsed * 1000.0)
	var result := ScoreManager.calculate_level({
		"kills": GameState.kill_count,
		"alerts": GameState.alert_count,
		"bodies_found": GameState.bodies_found,
		"minigame_fails": GameState.minigame_fails,
		"secrets": GameState.secrets_found,
		"time_ms": time_ms,
		"par_ms": int(current_level_data.get("par", 240000))
	})
	var score := int(result["score"])
	var rank := str(result["rank"])
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
		overlay_text.text = "LEVEL COMPLETE\n\n" + str(current_level_data.get("name", "")) + "\nRank: " + rank + "\nScore: " + str(score) + "\nCredits: " + str(GameState.credits) + "\n\nNext: Level " + str(GameState.current_level + 1)
		_set_buttons([["NEXT LEVEL", func() -> void: _start_level(GameState.current_level + 1)], ["MAIN MENU", _show_main_menu]])

func _fail_level(reason: String) -> void:
	level_done = true
	EventBus.level_failed.emit(reason)
	overlay.visible = true
	overlay_text.text = "MISSION FAILED\n\n" + reason + "\n\nThe city learned your rhythm. Try cleaner."
	AudioManager.play_sfx("fail")
	_set_buttons([["RETRY", func() -> void: _start_level(GameState.current_level)], ["MAIN MENU", _show_main_menu]])

func _show_ending() -> void:
	overlay.visible = true
	overlay_text.text = StoryManager.ending_title() + "\n\n" + StoryManager.ending_text() + "\n\nFinal score: " + str(GameState.session_score)
	_set_buttons([["NEW RUN", _show_main_menu]])

func _show_pause() -> void:
	if active_minigame != "":
		return
	overlay.visible = not overlay.visible
	if overlay.visible:
		overlay_text.text = "PAUSED\n\nEsc resumes. R restarts. This build keeps the Vercel/AdSense path documented and safe."
		_set_buttons([["RESUME", _show_pause], ["RESTART", func() -> void: _start_level(GameState.current_level)]])
	else:
		_set_buttons([])

func _apply_story_flags() -> void:
	var level := GameState.current_level
	if GameState.current_path == GameState.PATH_SPY:
		if level == 1:
			GameState.set_flag("saw_extra_data", true)
		elif level == 2:
			GameState.set_flag("saw_own_file", true)
		elif level == 5:
			GameState.set_flag("found_own_origin", true)
		elif level == 6:
			GameState.set_flag("server_choice", "copy_destroy")
		elif level == 8:
			GameState.set_flag("took_master_key", true)
	else:
		if level == 1:
			GameState.set_flag("heard_market_message", true)
		elif level == 2:
			GameState.set_flag("found_echo_ref", true)
		elif level == 4:
			GameState.set_flag("saw_nova_donor", true)
		elif level == 5:
			GameState.set_flag("lot7_found", true)
		elif level == 6:
			GameState.set_flag("vanta_choice", "expose")
			GameState.set_flag("sparks_status", "ally")
		elif level == 8:
			GameState.set_flag("nova_is_vanta", true)

func _on_backup_requested(origin: Vector2, caller: Node2D) -> void:
	for guard in guards:
		if guard != caller and not guard.disabled:
			guard.last_known_pos = origin
			guard.awareness = maxf(guard.awareness, 0.65)
			return

func _highest_awareness() -> float:
	var highest := 0.0
	for guard in guards:
		if is_instance_valid(guard):
			highest = maxf(highest, guard.awareness)
	return highest

func _player_in_shadow() -> bool:
	if not player:
		return false
	var pos := player.global_position
	return zones.has("shadow_a") and (zones["shadow_a"].has_point(pos) or zones["shadow_b"].has_point(pos))

func _solution_for_minigame(game_type: String) -> Array[String]:
	match game_type:
		"neural_decrypt":
			return ["TRACE", "SYNC", "BYPASS"]
		"safecrack":
			return ["SYNC", "TRACE", "SYNC"]
		"pickpocket":
			return ["TRACE", "TRACE", "BYPASS"]
		"wire_splice":
			return ["SPLICE", "TRACE", "BYPASS"]
		"signal_trace":
			return ["SYNC", "SPLICE", "SYNC"]
		"bribe_dialogue":
			return ["BYPASS", "TRACE", "SYNC"]
		"coop_hack":
			return ["TRACE", "SPLICE", "SYNC", "BYPASS"]
	return ["TRACE", "SYNC"]

func _minigame_title(game_type: String) -> String:
	match game_type:
		"neural_decrypt":
			return "NEURAL DECRYPT"
		"safecrack":
			return "SAFECRACK AUDIO"
		"pickpocket":
			return "PICKPOCKET RHYTHM"
		"wire_splice":
			return "WIRE SPLICE"
		"signal_trace":
			return "SIGNAL TRACE"
		"bribe_dialogue":
			return "BRIBE DIALOGUE"
		"coop_hack":
			return "CO-OP HACK"
	return game_type.to_upper()

func _update_hud() -> void:
	if current_level_data.is_empty():
		return
	hud_label.text = "ECHO HEIST // " + GameState.current_path.to_upper() + " // L" + str(GameState.current_level) + " " + str(current_level_data.get("name", "")) + " // HP " + str(GameState.health) + " // ALERTS " + str(GameState.alert_count) + " // SCORE " + str(GameState.session_score) + " // DADS " + DADS.current_tier.to_upper()

func _add_rect(name: String, rect: Rect2, fill: Color, border: Color) -> void:
	var poly := Polygon2D.new()
	poly.name = name
	poly.polygon = PackedVector2Array([rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y)])
	poly.color = fill
	stage.add_child(poly)
	var line := Line2D.new()
	line.width = 1.0
	line.closed = true
	line.default_color = border
	line.points = poly.polygon
	stage.add_child(line)

func _add_world_label(text: String, pos: Vector2, color: Color) -> void:
	var label := Label.new()
	label.text = text
	label.position = pos
	label.add_theme_font_size_override("font_size", 10)
	label.add_theme_color_override("font_color", color)
	stage.add_child(label)

func _set_buttons(buttons: Array) -> void:
	for child in button_box.get_children():
		child.queue_free()
	for spec in buttons:
		var button := Button.new()
		button.text = spec[0]
		button.custom_minimum_size = Vector2(476, 28)
		var callback: Callable = spec[1]
		button.pressed.connect(callback)
		button_box.add_child(button)

func _panel_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.content_margin_left = 14
	style.content_margin_top = 12
	style.content_margin_right = 14
	style.content_margin_bottom = 12
	return style

func _clear_stage() -> void:
	if stage:
		stage.queue_free()
	if player:
		player.queue_free()
	for guard in guards:
		if is_instance_valid(guard):
			guard.queue_free()
	guards.clear()
	for child in root_ui.get_children():
		if child != hud_label and child != hint_label and child != overlay:
			child.queue_free()
