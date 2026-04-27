extends Node

const SAVE_KEY := "echo_heist_save"
const FALLBACK_PATH := "user://echo_heist_save.json"

func save_local(data: Dictionary) -> void:
	var json_str := JSON.stringify(data)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("localStorage.setItem('%s', %s)" % [SAVE_KEY, JSON.stringify(json_str)])
	else:
		var file := FileAccess.open(FALLBACK_PATH, FileAccess.WRITE)
		if file:
			file.store_string(json_str)

func load_local() -> Dictionary:
	if OS.has_feature("web"):
		var raw = JavaScriptBridge.eval("localStorage.getItem('%s')" % SAVE_KEY)
		if raw == null:
			return {}
		var parsed = JSON.parse_string(str(raw))
		return parsed if typeof(parsed) == TYPE_DICTIONARY else {}
	if not FileAccess.file_exists(FALLBACK_PATH):
		return {}
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(FALLBACK_PATH))
	return parsed if typeof(parsed) == TYPE_DICTIONARY else {}

func auto_save() -> void:
	save_local(GameState.build_save_dict())
