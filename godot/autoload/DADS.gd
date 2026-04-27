extends Node

const TIERS := {
	"novice": {"min": 0, "fov": 80.0, "aware": 0.60, "speed": 0.80, "alerts": 3},
	"shadow": {"min": 1001, "fov": 90.0, "aware": 0.80, "speed": 1.00, "alerts": 2},
	"ghost": {"min": 3001, "fov": 110.0, "aware": 1.10, "speed": 1.00, "alerts": 1},
	"phantom": {"min": 6001, "fov": 130.0, "aware": 1.25, "speed": 1.15, "alerts": 1},
	"legend": {"min": 10001, "fov": 150.0, "aware": 1.50, "speed": 1.30, "alerts": 1}
}

var current_tier := "shadow"
var tier_data := TIERS["shadow"].duplicate()

func initialize_from_save(save: Dictionary) -> void:
	var old := current_tier
	current_tier = score_to_tier(int(save.get("last_run_score", 0)))
	tier_data = TIERS[current_tier].duplicate()
	if old != current_tier:
		EventBus.tier_changed.emit(old, current_tier)

func apply_to_guard(guard: Node) -> void:
	guard.fov_degrees = float(tier_data["fov"])
	guard.awareness_rate = float(tier_data["aware"])
	guard.move_speed = guard.base_speed * float(tier_data["speed"])
	guard.max_alerts = int(tier_data["alerts"])

func get_minigame_time_mod() -> float:
	match current_tier:
		"novice":
			return 1.40
		"shadow":
			return 1.00
		"ghost":
			return 0.90
		"phantom":
			return 0.80
		"legend":
			return 0.65
	return 1.00

func should_spawn_extra_guard() -> bool:
	return current_tier in ["ghost", "phantom", "legend"] and randf() < 0.35

func score_to_tier(score: int) -> String:
	for tier in ["legend", "phantom", "ghost", "shadow", "novice"]:
		if score >= int(TIERS[tier]["min"]):
			return tier
	return "novice"
