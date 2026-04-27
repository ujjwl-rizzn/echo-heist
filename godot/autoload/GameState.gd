extends Node

const PATH_SPY := "spy"
const PATH_CRIME := "crime"

var current_path := PATH_SPY
var current_level := 1
var session_score := 0
var level_score := 0
var credits := 0
var health := 100
var oxygen := 100
var current_heat := 0.0
var current_awareness := 0.0
var alert_count := 0
var kill_count := 0
var bodies_found := 0
var minigame_fails := 0
var secrets_found := 0
var start_time_ms := 0
var inventory: Array[String] = []
var equipped: Array[String] = []
var ng_plus := false
var session_token := ""

var flags := {
	"nova_doubted": false,
	"kael_silent_l1": false,
	"saw_extra_data": false,
	"rival_eliminated": false,
	"saw_own_file": false,
	"found_own_origin": false,
	"nova_warned_kael": false,
	"stole_civilian_data": false,
	"server_choice": "",
	"rin_asked_client": false,
	"rin_checked_knife": false,
	"heard_market_message": false,
	"found_echo_ref": false,
	"echo_ref_2": false,
	"saw_nova_donor": false,
	"broker_doubt": false,
	"lot7_found": false,
	"mako_left_boat": false,
	"sparks_status": "",
	"vanta_choice": "",
	"nova_is_vanta": false,
	"took_master_key": false
}

func new_run(path: String) -> void:
	current_path = path
	current_level = 1
	session_score = 0
	credits = 200
	inventory.clear()
	equipped.clear()
	_reset_level_stats()
	start_time_ms = Time.get_ticks_msec()
	EventBus.path_selected.emit(path)

func begin_level(level_id: int) -> void:
	current_level = level_id
	_reset_level_stats()
	start_time_ms = Time.get_ticks_msec()
	EventBus.level_loaded.emit(level_id, current_path)

func add_score(points: int, reason: String = "") -> void:
	level_score = max(0, level_score + points)
	session_score = max(0, session_score + points)
	if reason != "":
		EventBus.score_popup.emit(points, reason)

func add_credits(amount: int) -> void:
	credits = max(0, credits + amount)

func set_flag(key: String, val) -> void:
	flags[key] = val
	SaveManager.save_local(build_save_dict())

func complete_objective(obj_id: String, points: int) -> void:
	add_score(points, obj_id)
	EventBus.objective_completed.emit(obj_id)

func register_alert(amount: float = 1.0) -> void:
	alert_count += 1
	current_heat = clampf(current_heat + amount * 0.18, 0.0, 1.0)
	EventBus.alert_level_changed.emit(alert_count)

func damage(amount: int) -> void:
	health = clampi(health - amount, 0, 100)
	if health <= 0:
		EventBus.level_failed.emit("downed")

func build_save_dict() -> Dictionary:
	return {
		"version": "1.0",
		"path": current_path,
		"level": current_level,
		"score": session_score,
		"credits": credits,
		"inventory": inventory,
		"equipped": equipped,
		"flags": flags,
		"ng_plus": ng_plus,
		"stats": {
			"kills": kill_count,
			"alerts": alert_count,
			"stealth_avg": 1.0 - clampf(current_heat, 0.0, 1.0)
		},
		"last_run_score": session_score
	}

func load_from_save(data: Dictionary) -> void:
	if data.is_empty():
		return
	current_path = data.get("path", PATH_SPY)
	current_level = int(data.get("level", 1))
	session_score = int(data.get("score", 0))
	credits = int(data.get("credits", 0))
	inventory.assign(data.get("inventory", []))
	equipped.assign(data.get("equipped", []))
	flags.merge(data.get("flags", {}), true)
	ng_plus = bool(data.get("ng_plus", false))

func _reset_level_stats() -> void:
	level_score = 0
	health = 100
	oxygen = 100
	current_heat = 0.0
	current_awareness = 0.0
	alert_count = 0
	kill_count = 0
	bodies_found = 0
	minigame_fails = 0
	secrets_found = 0
