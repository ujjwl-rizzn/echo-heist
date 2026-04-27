extends Node

var player: AudioStreamPlayer
var playback: AudioStreamGeneratorPlayback

func _ready() -> void:
	var stream := AudioStreamGenerator.new()
	stream.mix_rate = 22050.0
	stream.buffer_length = 0.08
	player = AudioStreamPlayer.new()
	player.stream = stream
	add_child(player)
	player.play()
	playback = player.get_stream_playback()

func play_sfx(name: String, pos: Vector2 = Vector2.ZERO) -> void:
	var freq := 440.0
	match name:
		"hack":
			freq = 760.0
		"alert":
			freq = 140.0
		"takedown":
			freq = 260.0
		"score":
			freq = 980.0
		"fail":
			freq = 100.0
		_:
			freq = 440.0
	_tone(freq, 0.07, 0.12)

func update_music(awareness: float, heat: float) -> void:
	var pressure := maxf(awareness, heat)
	if pressure > 0.75:
		_tone(110.0, 0.025, 0.035)

func _tone(freq: float, duration: float, volume: float) -> void:
	if playback == null:
		return
	var rate := 22050.0
	var frames := int(rate * duration)
	for i in range(frames):
		var sample := sin(TAU * freq * float(i) / rate) * volume
		playback.push_frame(Vector2(sample, sample))
