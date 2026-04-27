extends RefCounted

const SIDE_SPY := 0
const SIDE_HEISTER := 1

var selected_side := SIDE_SPY
var current_mission := 0
var heat := 0
var score := 0
var health := 100
var ammo := 3
var has_target := false
var escaped := false
var detected := false
var vault_unlocked := false
var guards_disabled := 0
var best_score := 0
var target_name := "Mirror Archive"
var objective := "Steal the archive key and escape."
var mission_status := "infiltration"
var route_result := ""

func set_side(side: int) -> void:
	selected_side = side
	if selected_side == SIDE_SPY:
		objective = "Steal proof, avoid collateral, escape clean."
	else:
		objective = "Steal the identity keys, survive heat, vanish rich."

func reset_run(mission: int = current_mission) -> void:
	current_mission = mission
	heat = 0
	score = 0
	health = 100
	ammo = 4 if selected_side == SIDE_HEISTER else 2
	has_target = false
	escaped = false
	detected = false
	vault_unlocked = false
	guards_disabled = 0
	mission_status = "infiltration"
	route_result = ""
	set_side(selected_side)

func side_name() -> String:
	if selected_side == SIDE_SPY:
		return "GOVERNMENT SPY"
	return "CRIMINAL HEISTER"

func side_tone() -> String:
	if selected_side == SIDE_SPY:
		return "clean, tactical, truth-driven"
	return "bold, risky, profit-driven"

func raise_heat(amount: int) -> void:
	heat = clampi(heat + amount, 0, 100)
	detected = heat >= 45

func lower_heat(amount: int) -> void:
	heat = clampi(heat - amount, 0, 100)
	detected = heat >= 45

func add_score(amount: int) -> void:
	score = max(0, score + amount)

func damage(amount: int) -> void:
	health = clampi(health - amount, 0, 100)
	if health == 0:
		mission_status = "downed"

func steal_target() -> void:
	if has_target:
		return
	has_target = true
	mission_status = "exfiltration"
	if selected_side == SIDE_SPY:
		add_score(750)
	else:
		add_score(1150)
		raise_heat(8)

func escape() -> void:
	if not has_target:
		return
	escaped = true
	mission_status = "escaped"
	if selected_side == SIDE_SPY:
		add_score(max(0, 600 - heat * 5))
	else:
		add_score(500 + heat * 3)
	best_score = max(best_score, score)

func disable_guard() -> void:
	guards_disabled += 1
	if selected_side == SIDE_SPY:
		add_score(150)
		raise_heat(6)
	else:
		add_score(240)
		raise_heat(12)

func unlock_vault() -> void:
	vault_unlocked = true
	if selected_side == SIDE_SPY:
		add_score(250)
		lower_heat(18)
	else:
		add_score(180)
		raise_heat(6)

func use_ammo() -> bool:
	if ammo <= 0:
		return false
	ammo -= 1
	return true
