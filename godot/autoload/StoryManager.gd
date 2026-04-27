extends Node

enum Ending {A_ECHO_PRESERVED, B_BOTH_BURN, C_UNITED, D_GHOST_FREE}

func determine_ending() -> Ending:
	var f := GameState.flags
	if GameState.current_path == GameState.PATH_SPY:
		return _spy_ending(f)
	return _crime_ending(f)

func ending_title() -> String:
	match determine_ending():
		Ending.A_ECHO_PRESERVED:
			return "ENDING A // ECHO PRESERVED"
		Ending.B_BOTH_BURN:
			return "ENDING B // BOTH BURN"
		Ending.C_UNITED:
			return "ENDING C // UNITED"
		Ending.D_GHOST_FREE:
			return "ENDING D // GHOST FREE"
	return "ENDING B // BOTH BURN"

func ending_text() -> String:
	match determine_ending():
		Ending.A_ECHO_PRESERVED:
			return "The system survives. The city keeps breathing data into machines that never blink."
		Ending.B_BOTH_BURN:
			return "The truth burns with the server. VANTA is wounded. Nobody wins clean."
		Ending.C_UNITED:
			return "Two ghosts trade truth for truth. Same enemy. One breach."
		Ending.D_GHOST_FREE:
			return "No handlers. No broker. No name. Somewhere in the city, a ghost becomes a person."
	return ""

func _spy_ending(f: Dictionary) -> Ending:
	var choice := str(f.get("server_choice", "destroy"))
	if choice == "run" and bool(f.get("found_own_origin", false)) and bool(f.get("nova_doubted", false)):
		return Ending.D_GHOST_FREE
	if choice == "copy_destroy":
		return Ending.C_UNITED
	if choice == "destroy" and not bool(f.get("nova_doubted", false)):
		return Ending.A_ECHO_PRESERVED
	return Ending.B_BOTH_BURN

func _crime_ending(f: Dictionary) -> Ending:
	var choice := str(f.get("vanta_choice", "burn"))
	if choice == "copy" and str(f.get("sparks_status", "gone")) == "gone" and bool(f.get("lot7_found", false)):
		return Ending.D_GHOST_FREE
	if choice == "expose" and bool(f.get("saw_nova_donor", false)):
		return Ending.C_UNITED
	if choice == "burn" and str(f.get("sparks_status", "gone")) == "ally":
		return Ending.A_ECHO_PRESERVED
	return Ending.B_BOTH_BURN
