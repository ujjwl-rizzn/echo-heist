## AudioManager.gd — COMPLETE
extends Node

var _layer_ambient: AudioStreamPlayer
var _layer_tension: AudioStreamPlayer
var _layer_alert:   AudioStreamPlayer
var _sfx_pool: Dictionary = {}
var _current_path: String = ""

func _ready() -> void:
	_layer_ambient = _make_layer("LayerAmbient")
	_layer_tension = _make_layer("LayerTension")
	_layer_alert   = _make_layer("LayerAlert")

func _make_layer(n: String) -> AudioStreamPlayer:
	var p := AudioStreamPlayer.new()
	p.name = n; p.volume_db = -80.0; p.bus = "Master"
	add_child(p); return p

func load_level_music(path: String, level: int) -> void:
	_current_path = path
	var base := "res://assets/audio/music/%s_l%d" % [path, level]
	_try_load(_layer_ambient, base + "_ambient.ogg")
	_try_load(_layer_tension, base + "_tension.ogg")
	_try_load(_layer_alert,   base + "_alert.ogg")
	for l in [_layer_ambient, _layer_tension, _layer_alert]:
		if l.stream: l.volume_db = -80.0; l.play()

func _try_load(player: AudioStreamPlayer, path: String) -> void:
	if ResourceLoader.exists(path): player.stream = load(path)

func update_music(awareness: float, heat: float) -> void:
	var a := maxf(awareness, heat)
	_fade_to(_layer_ambient, _db(clamp(1.0 - a*1.5, 0.0, 1.0)))
	_fade_to(_layer_tension, _db(clamp(a*2.0,       0.0, 1.0)))
	_fade_to(_layer_alert,   _db(clamp((a-0.6)*2.5, 0.0, 1.0)))

func _fade_to(p: AudioStreamPlayer, target: float) -> void:
	p.volume_db = lerpf(p.volume_db, target, 0.04)

func _db(t: float) -> float:
	return lerpf(-80.0, -6.0, t)

func play_sfx(sfx_name: String, position: Vector2 = Vector2.ZERO) -> void:
	var path := "res://assets/audio/sfx/%s.ogg" % sfx_name
	if not ResourceLoader.exists(path): return
	if sfx_name in _sfx_pool:
		var p: AudioStreamPlayer2D = _sfx_pool[sfx_name]
		p.global_position = position; p.play(); return
	var p2 := AudioStreamPlayer2D.new()
	p2.stream = load(path); p2.bus = "Master"
	p2.global_position = position
	add_child(p2); p2.play()
	_sfx_pool[sfx_name] = p2

func play_sfx_ui(sfx_name: String) -> void:
	var path := "res://assets/audio/sfx/%s.ogg" % sfx_name
	if not ResourceLoader.exists(path): return
	var p := AudioStreamPlayer.new()
	p.stream = load(path); p.bus = "Master"; p.autoplay = true
	add_child(p); p.finished.connect(p.queue_free)
