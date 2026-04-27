extends Node

func calculate_level(data: Dictionary) -> Dictionary:
	var score := 1000
	score -= int(data.get("kills", 0)) * 200
	score -= int(data.get("alerts", 0)) * 150
	score -= int(data.get("bodies_found", 0)) * 120
	score -= int(data.get("minigame_fails", 0)) * 80
	score -= max(0, int((int(data.get("time_ms", 0)) - int(data.get("par_ms", 240000))) / 5000))
	score += int(data.get("secrets", 0)) * 300
	score = max(score, 0)
	var rank := "D"
	if score >= 900:
		rank = "S"
	elif score >= 700:
		rank = "A"
	elif score >= 500:
		rank = "B"
	elif score >= 300:
		rank = "C"
	return {"score": score, "rank": rank}

func calculate_run(level_records: Array) -> Dictionary:
	var total := 0
	var stealth_sum := 0.0
	var kills_total := 0
	for rec in level_records:
		total += int(rec.get("score", 0))
		stealth_sum += float(rec.get("stealth_ratio", 1.0))
		kills_total += int(rec.get("kills", 0))
	var stealth_avg: float = stealth_sum / float(max(level_records.size(), 1))
	var method := "Brute"
	if kills_total == 0 and stealth_avg > 0.9:
		method = "Ghost"
	elif kills_total == 0:
		method = "Shadow"
	elif kills_total <= 3:
		method = "Assassin"
	return {"total_score": total, "stealth_avg": stealth_avg, "method": method}
