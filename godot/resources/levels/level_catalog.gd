extends RefCounted

const SPY_LEVELS := [
	{"id": 1, "name": "Cold Entry", "type": "tutorial", "minigame": "neural_decrypt", "par": 240000, "objective": "Extract executive blackmail data."},
	{"id": 2, "name": "Server Room Alpha", "type": "stealth", "minigame": "neural_decrypt", "par": 270000, "objective": "Hack three server terminals and find the grapple hook."},
	{"id": 3, "name": "The Glass Tower", "type": "vertical", "minigame": "neural_decrypt", "par": 300000, "objective": "Breach the 38th-floor server during lightning windows."},
	{"id": 4, "name": "Ghost Protocol: Rivals", "type": "rival", "minigame": "signal_trace", "par": 250000, "objective": "Use or eliminate the rival spy at the relay."},
	{"id": 5, "name": "Aqua Vault", "type": "oxygen", "minigame": "signal_trace", "par": 320000, "objective": "Recover the ECHO-7 chip under oxygen pressure."},
	{"id": 6, "name": "Inside the Machine", "type": "betrayal", "minigame": "neural_decrypt", "par": 420000, "objective": "Choose what Kael-7 does with the ECHO files."},
	{"id": 7, "name": "The Rogue Swarm", "type": "drones", "minigame": "neural_decrypt", "par": 360000, "objective": "Install the AI kill-switch."},
	{"id": 8, "name": "Zero Gravity", "type": "space", "minigame": "signal_trace", "par": 420000, "objective": "Take the ECHO master key."},
	{"id": 9, "name": "The Programme Ends", "type": "nova", "minigame": "neural_decrypt", "par": 420000, "objective": "Reach NOVA's private server."},
	{"id": 10, "name": "The Convergence", "type": "finale", "minigame": "coop_hack", "par": 360000, "objective": "Decide the truth with Rin in the room."}
]

const CRIME_LEVELS := [
	{"id": 1, "name": "Night Market Crawl", "type": "tutorial", "minigame": "pickpocket", "par": 240000, "objective": "Steal the cop keycard and reach Sparks."},
	{"id": 2, "name": "Precinct 7", "type": "infiltrate", "minigame": "safecrack", "par": 300000, "objective": "Crack the evidence safe and find Operation ECHO."},
	{"id": 3, "name": "Blacksite Server", "type": "faction", "minigame": "wire_splice", "par": 300000, "objective": "Steal from Nexcorp while the Broker glitches."},
	{"id": 4, "name": "Floating Penthouse", "type": "social", "minigame": "safecrack", "par": 330000, "objective": "Steal the gala data chip without witnesses."},
	{"id": 5, "name": "The Broker's Hand", "type": "auction", "minigame": "wire_splice", "par": 480000, "objective": "Copy the auction package before transfer."},
	{"id": 6, "name": "The Broker Burns", "type": "betrayal", "minigame": "bribe_dialogue", "par": 420000, "objective": "Choose what Rin does with the VANTA relay."},
	{"id": 7, "name": "Ghost Crew Last Stand", "type": "home", "minigame": "wire_splice", "par": 360000, "objective": "Recover the hard drive from the ruined den."},
	{"id": 8, "name": "The Auction House Falls", "type": "vanta", "minigame": "wire_splice", "par": 540000, "objective": "Copy the VANTA routing table."},
	{"id": 9, "name": "Rin Alone", "type": "nova", "minigame": "bribe_dialogue", "par": 420000, "objective": "Reach the NOVA server from below."},
	{"id": 10, "name": "The Convergence", "type": "finale", "minigame": "coop_hack", "par": 360000, "objective": "Decide the truth with Kael-7 in the room."}
]

static func get_level(path: String, id: int) -> Dictionary:
	var list := SPY_LEVELS if path == "spy" else CRIME_LEVELS
	for level in list:
		if int(level["id"]) == id:
			return level
	return list[0]
