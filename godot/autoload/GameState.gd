## GameState.gd — COMPLETE — all methods referenced by main.gd
extends Node

const PATH_SPY   := "spy"
const PATH_CRIME := "crime"

var current_path:  String  = ""
var current_level: int     = 0
var session_score: int     = 0
var credits:       int     = 0
var last_run_score:int     = 0
var health:        int     = 5
var alert_count:   int     = 0
var kill_count:    int     = 0
var bodies_found:  int     = 0
var minigame_fails:int     = 0
var secrets_found: int     = 0
var ng_plus:       bool    = false
var current_awareness: float = 0.0
var current_heat:      float = 0.0
var session_token: String  = ""
var player_id:     String  = ""
var inventory:     Array[String] = []
var equipped:      Array[String] = []
var level_records: Array[Dictionary] = []
var _level_start_ms: int   = 0

var flags: Dictionary = {
	"nova_doubted":false,"nova_trusted":true,"saw_extra_data":false,
	"rival_eliminated":false,"saw_own_file":false,"found_own_origin":false,
	"nova_warned_kael":false,"stole_civilian_data":false,"server_choice":"",
	"kael_silent_l1":false,"took_master_key":false,"nova_is_vanta":false,
	"rin_asked_client":false,"heard_market_message":false,"found_echo_ref":false,
	"echo_ref_2":false,"saw_nova_donor":false,"broker_doubt":false,
	"lot7_found":false,"mako_left_boat":false,"sparks_status":"gone",
	"vanta_choice":"","rin_checked_knife":false,"ghost_crew_absent":false,
}

func _ready() -> void:
	var save := SaveManager.load_local()
	if not save.is_empty(): load_from_save(save)

func new_run(path: String) -> void:
	current_path   = path
	current_level  = 1
	session_score  = 0
	credits        = 200
	health         = 5
	alert_count    = 0
	kill_count     = 0
	bodies_found   = 0
	minigame_fails = 0
	secrets_found  = 0
	ng_plus        = false
	current_awareness = 0.0
	current_heat      = 0.0
	inventory.clear()
	equipped.clear()
	level_records.clear()
	flags = flags.duplicate()  # reset to defaults
	SaveManager.save_local(_build_save_dict())

func begin_level(level_id: int) -> void:
	current_level    = level_id
	_level_start_ms  = Time.get_ticks_msec()
	alert_count      = 0
	kill_count       = 0
	bodies_found     = 0
	minigame_fails   = 0
	secrets_found    = 0
	current_awareness= 0.0
	current_heat     = 0.0

func add_score(points: int, reason: String = "") -> void:
	session_score += points
	if reason != "":
		EventBus.score_popup.emit(points, reason)

func add_credits(amount: int) -> void:
	credits += amount
	EventBus.credits_changed.emit(credits)

func register_alert(weight: float) -> void:
	if weight >= 1.0:
		alert_count += 1
	current_awareness = minf(current_awareness + weight * 0.5, 1.0)
	EventBus.alert_level_changed.emit(alert_count)

func complete_objective(obj_id: String, bonus: int = 0) -> void:
	if bonus > 0: add_score(bonus, obj_id)
	EventBus.objective_completed.emit(obj_id)

func set_flag(key: String, val) -> void:
	flags[key] = val
	EventBus.flag_set.emit(key, val)
	SaveManager.save_local(_build_save_dict())

func load_from_save(save: Dictionary) -> void:
	current_path   = save.get("path",  "")
	current_level  = save.get("level", 0)
	session_score  = save.get("score", 0)
	credits        = save.get("credits", 200)
	last_run_score = save.get("last_run_score", 0)
	health         = save.get("health", 5)
	ng_plus        = save.get("ng_plus", false)
	inventory.clear()
	for item in save.get("inventory", []):
		inventory.append(str(item))
	equipped.clear()
	for item in save.get("equipped", []):
		equipped.append(str(item))
	var saved_flags: Dictionary = save.get("flags", {})
	for k in saved_flags: flags[k] = saved_flags[k]

func _build_save_dict() -> Dictionary:
	return {
		"version":        "1.1",
		"path":           current_path,
		"level":          current_level,
		"score":          session_score,
		"credits":        credits,
		"last_run_score": last_run_score,
		"health":         health,
		"ng_plus":        ng_plus,
		"inventory":      inventory,
		"equipped":       equipped,
		"flags":          flags,
		"kills":          kill_count,
		"alerts":         alert_count,
		"dads_tier":      DADS.current_tier,
	}
