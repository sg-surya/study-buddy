import numpy as np, wave, struct

SR = 44100
DUR = 20.0
N = int(SR * DUR)
t = np.arange(N) / SR
mix = np.zeros(N)

def add(start, sig):
    i = int(start * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    mix[i:j] += sig[: j - i]

def env_exp(n, rate):
    return np.exp(-np.arange(n) / SR * rate)

def pluck(freq, dur, gain=0.22):
    n = int(dur * SR); tt = np.arange(n) / SR
    e = env_exp(n, 7)
    s = np.sin(2*np.pi*freq*tt) + 0.45*np.sin(2*np.pi*freq*2*tt) + 0.18*np.sin(2*np.pi*freq*3*tt)
    return gain * e * s

def kick(gain=0.55):
    n = int(0.16 * SR); tt = np.arange(n) / SR
    f = 45 + 60 * np.exp(-tt * 28)
    phase = 2*np.pi*np.cumsum(f)/SR
    return gain * np.exp(-tt * 16) * np.sin(phase)

def hat(gain=0.06):
    n = int(0.05 * SR)
    noise = np.random.randn(n)
    hp = np.diff(noise, prepend=0.0)          # crude highpass
    return gain * hp * np.exp(-np.arange(n)/SR * 70)

def snare(gain=0.16):
    n = int(0.14 * SR); tt = np.arange(n) / SR
    noise = np.random.randn(n)
    body = 0.5 * np.sin(2*np.pi*185*tt)
    return gain * (0.8*noise + body) * np.exp(-tt * 22)

def pad(freqs, dur, gain=0.05):
    n = int(dur * SR); tt = np.arange(n) / SR
    a = np.minimum(1.0, tt / 0.6)
    r = np.minimum(1.0, (dur - tt) / 0.8)
    s = np.zeros(n)
    for f in freqs:
        s += np.sin(2*np.pi*f*tt) + 0.5*np.sin(2*np.pi*(f*1.004)*tt)
    return gain * a * r * s / len(freqs)

def whoosh(dur=0.55, gain=0.16):
    n = int(dur * SR); tt = np.arange(n) / SR
    noise = np.random.randn(n)
    # rising then falling amplitude + one-pole lowpass opening up
    amp = np.sin(np.pi * tt / dur) ** 1.5
    y = np.zeros(n); prev = 0.0
    for i in range(n):
        cutoff = 0.04 + 0.35 * (i / n)         # opens upward
        prev = prev + cutoff * (noise[i] - prev)
        y[i] = prev
    return gain * amp * y * 3.0

def pop(gain=0.22):
    n = int(0.09 * SR); tt = np.arange(n) / SR
    f = 900 + 700 * np.exp(-tt * 40)
    phase = 2*np.pi*np.cumsum(f)/SR
    return gain * np.exp(-tt * 34) * np.sin(phase)

def thud(gain=0.4):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    f = 62 * np.exp(-tt * 5) + 40
    phase = 2*np.pi*np.cumsum(f)/SR
    return gain * np.exp(-tt * 7) * np.sin(phase)

# ---- notes (C minor color) ----
NOTE = {"C4":261.63,"Eb4":311.11,"G4":392.0,"Bb4":466.16,"C5":523.25,
        "Ab3":207.65,"Eb3":155.56,"Bb3":116.54,"C3":130.81,"F4":349.23,"Ab4":415.30}
CHORDS = [  # 4.8s each: Cm, Ab, Eb, Bb
    {"root":"C3","arp":["C4","Eb4","G4","Bb4","G4","Eb4","C4","Eb4"]},
    {"root":"Ab3","arp":["Ab4","C5","Eb4","C5","Ab4","Eb4","C4","Eb4"]},
    {"root":"Eb3","arp":["Eb4","G4","Bb4","G4","Eb4","G4","Bb4","C5"]},
    {"root":"Bb3","arp":["Bb4","G4","F4","G4","Bb4","C5","Bb4","G4"]},
]
PADS = [ ["C3","Eb4","G4"], ["Ab3","C4","Eb4"], ["Eb3","G4","Bb4"], ["Bb3","F4","Bb4"] ]

# ---- pads (one per 4.8s) ----
for i, freqs in enumerate(PADS):
    fs = [NOTE.get(f, 0) for f in freqs]
    fs = [f for f in fs if f]
    add(i * 4.8, pad(fs, 4.9))

# ---- drums + arp ----
BEAT = 0.6
n_beats = int(DUR / BEAT)
for b in range(n_beats):
    tb = b * BEAT
    if tb < 2.2:      # sparse open (hook: hats only)
        if b % 2 == 0: add(tb, hat(0.05))
        continue
    if b % 2 == 0: add(tb, kick(0.5 if tb > 5.0 else 0.35))
    if b % 4 in (1, 3): add(tb, snare())
    add(tb, hat(0.055)); add(tb + BEAT/2, hat(0.04))

# arp: 8th notes from 2.4s to 19.6s
EIGHTH = 0.3
t0 = 2.4
idx = 0
while t0 < 19.6:
    ch = int((t0 - 2.4) // 4.8) % 4
    note = CHORDS[ch]["arp"][idx % 8]
    g = 0.2 if 5.0 < t0 < 17.0 else 0.12
    add(t0, pluck(NOTE[note], 0.5, g))
    t0 += EIGHTH; idx += 1

# ---- scene SFX (aligned to storyboard) ----
add(2.42, pop(0.10))            # hook -> reveal letter tick
add(5.15, whoosh(0.6, 0.15))    # reveal -> real UI strip wipe
add(10.15, whoosh(0.6, 0.15))   # UI -> proof
add(11.55, pop(0.2))            # chip click
add(14.95, thud(0.42))          # NOT FOUND lands
add(17.2, whoosh(0.4, 0.12))
add(17.3, kick(0.7)); add(17.3, pluck(NOTE["C5"], 1.6, 0.25)); add(17.3, pluck(NOTE["C4"], 1.8, 0.18))

# ---- master: gentle delay for space + normalize ----
d = int(0.25 * SR)
echo = np.zeros(N); echo[d:] = mix[:-d] * 0.22
d2 = int(0.5 * SR); echo[d2:] += mix[:-d2] * 0.10
master = mix + echo
peak = np.max(np.abs(master))
master = master / peak * 0.85
fade = int(0.15 * SR)
master[:fade] *= np.linspace(0, 1, fade)
master[-fade:] *= np.linspace(1, 0, fade)
stereo = np.stack([master, master], axis=1)

with wave.open("assets/music.wav", "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print("assets/music.wav written", len(master)/SR, "s")
