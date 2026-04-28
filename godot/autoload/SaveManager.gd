## SaveManager.gd — COMPLETE with auto_save()
extends Node

const SAVE_KEY := "echo_heist_save_v1"

func save_local(data: Dictionary) -> void:
	var json_str := JSON.stringify(data)
	if OS.get_name() == "Web":
		JavaScriptBridge.eval(
			"try{localStorage.setItem('%s',JSON.stringify(%s));}catch(e){}" % [SAVE_KEY, json_str]
		)
	else:
		var f := FileAccess.open("user://save.json", FileAccess.WRITE)
		if f: f.store_string(json_str); f.close()

func load_local() -> Dictionary:
	if OS.get_name() == "Web":
		var raw: Variant = JavaScriptBridge.eval("(function(){try{return localStorage.getItem('%s');}catch(e){return null;}})()" % SAVE_KEY)
		if raw == null or str(raw) == "null" or str(raw) == "": return {}
		var result: Variant = JSON.parse_string(str(raw))
		return result if result is Dictionary else {}
	else:
		if not FileAccess.file_exists("user://save.json"): return {}
		var f := FileAccess.open("user://save.json", FileAccess.READ)
		if not f: return {}
		var result: Variant = JSON.parse_string(f.get_as_text())
		f.close()
		return result if result is Dictionary else {}

func auto_save() -> void:
	save_local(GameState._build_save_dict())
	var supabase := get_node_or_null("/root/SupabaseClient")
	if supabase and supabase.has_method("post_run"):
		supabase.post_run(GameState._build_save_dict())

func clear_local() -> void:
	if OS.get_name() == "Web":
		JavaScriptBridge.eval("try{localStorage.removeItem('%s');}catch(e){}" % SAVE_KEY)
	else:
		if FileAccess.file_exists("user://save.json"):
			DirAccess.remove_absolute("user://save.json")
