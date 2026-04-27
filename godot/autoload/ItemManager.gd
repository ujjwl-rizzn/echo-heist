extends Node

var registry := {
	"emp_grenade": {"name": "EMP Grenade", "path": "spy", "unlock_type": "rank", "unlock_level": 1, "unlock_rank": "S", "credit_cost": 0},
	"tranq_dart": {"name": "Tranq Dart Pistol", "path": "spy", "unlock_type": "rank", "unlock_level": 1, "unlock_rank": "A", "credit_cost": 0},
	"grapple_hook": {"name": "Grapple Hook", "path": "spy", "unlock_type": "find", "unlock_level": 2, "credit_cost": 0},
	"cloak_charge": {"name": "Cloak Suit Charge", "path": "spy", "unlock_type": "credit", "unlock_level": 3, "credit_cost": 800},
	"smoke_bomb": {"name": "Smoke Bomb", "path": "crime", "unlock_type": "rank", "unlock_level": 1, "unlock_rank": "A", "credit_cost": 0},
	"phantom_deck": {"name": "Phantom Deck v2", "path": "crime", "unlock_type": "find", "unlock_level": 1, "credit_cost": 0},
	"disguise_kit": {"name": "Disguise Kit", "path": "crime", "unlock_type": "credit", "unlock_level": 1, "credit_cost": 500},
	"pulse_boots": {"name": "EMP Pulse Boots", "path": "crime", "unlock_type": "find", "unlock_level": 2, "credit_cost": 0}
}

var unlocked: Array[String] = []

func unlock(item_id: String, source: String) -> void:
	if item_id in unlocked:
		return
	if not registry.has(item_id):
		return
	unlocked.append(item_id)
	if item_id not in GameState.inventory:
		GameState.inventory.append(item_id)
	SaveManager.save_local(GameState.build_save_dict())
	EventBus.item_unlocked.emit(item_id, source)

func try_rank_unlock(level: int, rank: String) -> void:
	for id in registry.keys():
		var item: Dictionary = registry[id]
		if item.get("unlock_type") == "rank" and int(item.get("unlock_level", 0)) == level and _rank_qualifies(rank, item.get("unlock_rank", "S")):
			unlock(id, "rank")

func try_credit_purchase(item_id: String) -> bool:
	if not registry.has(item_id):
		return false
	var cost := int(registry[item_id].get("credit_cost", 0))
	if GameState.credits < cost:
		return false
	GameState.credits -= cost
	unlock(item_id, "credits")
	return true

func _rank_qualifies(earned: String, required: String) -> bool:
	var order := ["S", "A", "B", "C", "D"]
	return order.find(earned) <= order.find(required)
