## StoryManager.gd — COMPLETE with ending_title() and ending_text()
extends Node

enum Ending { A_ECHO_PRESERVED, B_BOTH_BURN, C_UNITED, D_GHOST_FREE }

func determine_ending() -> Ending:
	var f: Dictionary = GameState.flags
	var path: String = GameState.current_path
	return _spy_ending(f) if path == GameState.PATH_SPY else _crime_ending(f)

func _spy_ending(f: Dictionary) -> Ending:
	var sc: String = str(f.get("server_choice", ""))
	var saw_origin: bool = bool(f.get("found_own_origin", false))
	var doubted: bool = bool(f.get("nova_doubted", false))
	var took_key: bool = bool(f.get("took_master_key", false))
	if sc == "run" and saw_origin and doubted and took_key: return Ending.D_GHOST_FREE
	if sc == "copy_destroy":                                return Ending.C_UNITED
	if sc == "destroy" and not doubted:                    return Ending.A_ECHO_PRESERVED
	return Ending.B_BOTH_BURN

func _crime_ending(f: Dictionary) -> Ending:
	var vc: String = str(f.get("vanta_choice", ""))
	var sparks: String = str(f.get("sparks_status", "gone"))
	var lot7: bool = bool(f.get("lot7_found", false))
	var nova_id: bool = bool(f.get("saw_nova_donor", false))
	if vc == "copy"   and sparks == "gone" and lot7:  return Ending.D_GHOST_FREE
	if vc == "expose" and nova_id:                    return Ending.C_UNITED
	if vc == "burn"   and sparks == "ally":           return Ending.A_ECHO_PRESERVED
	return Ending.B_BOTH_BURN

func ending_title() -> String:
	match determine_ending():
		Ending.A_ECHO_PRESERVED: return "ENDING A // ECHO PRESERVED"
		Ending.B_BOTH_BURN:      return "ENDING B // BOTH BURN"
		Ending.C_UNITED:         return "ENDING C // UNITED"
		Ending.D_GHOST_FREE:     return "ENDING D // GHOST FREE"
	return "ENDING UNKNOWN"

func ending_text() -> String:
	match determine_ending():
		Ending.A_ECHO_PRESERVED:
			return "The system survives. A new operative begins training tomorrow.\nThe city exhales. The data flows. Nothing changed."
		Ending.B_BOTH_BURN:
			return "The server room burns. The data is ash.\nVANTA is crippled. NOVA goes silent. Both operatives vanish.\nThe city carries the weight of a secret no one will ever tell."
		Ending.C_UNITED:
			return "Kael-7 and Rin stand on opposite sides of the same truth.\nThey share everything. The world learns the name ECHO HEIST.\nIt costs them everything. It was worth it."
		Ending.D_GHOST_FREE:
			return "No broadcast. No exposure. No war.\nTwo ghosts move through the city freely.\nNeither knows the other made the same choice.\nThe world thinks they vanished. They did."
	return "The city moves on. It always does."

func get_ending_scene_path() -> String:
	return "res://scenes/endings/ending_%s.tscn" % ["a","b","c","d"][determine_ending()]
