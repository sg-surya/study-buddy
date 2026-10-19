import numpy as np, wave

SR = 44100
DUR = 170.0            # total root duration (incl. outro ring-out)
N = int(SR * DUR)
mix = np.zeros(N)

def add(start, sig):
    i = int(start * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig))
    mix[i:j] += sig[: j - i]

def env_exp(n, rate):
    return np.exp(-np.arange(n) / SR * rate)

def pluck(freq, dur, gain=0.14):
    n = int(dur * SR); tt = np.arange(n) / SR
    e = env_exp(n, 6.5)
    s = np.sin(2*np.pi*freq*tt) + 0.4*np.sin(2*np.pi*freq*2*tt) + 0.12*np.sin(2*np.pi*freq*3*tt)
    return gain * e * s

def kick(gain=0.32):
    n = int(0.18 * SR); tt = np.arange(n) / SR
    f = 42 + 55 * np.exp(-tt * 26)
    phase = 2*np.pi*np.cumsum(f)/SR
    return gain * np.exp(-tt * 14) * np.sin(phase)

def hat(gain=0.035):
    n = int(0.05 * SR)
    noise = np.random.randn(n)
    hp = np.diff(noise, prepend=0.0)
    return gain * hp * np.exp(-np.arange(n)/SR * 70)

def shaker(gain=0.03):
    n = int(0.08 * SR)
    noise = np.random.randn(n)
    hp = np.diff(noise, prepend=0.0)
    tt = np.arange(n)/SR
    return gain * hp * np.exp(-tt * 40) * np.minimum(1, tt*80)

def pad(freqs, dur, gain=0.035):
    n = int(dur * SR); tt = np.arange(n) / SR
    a = np.minimum(1.0, tt / 1.2)
    r = np.minimum(1.0, (dur - tt) / 1.2)
    s = np.zeros(n)
    for f in freqs:
        s += np.sin(2*np.pi*f*tt) + 0.5*np.sin(2*np.pi*(f*1.004)*tt)
    return gain * a * r * s / len(freqs)

def bass(freq, dur, gain=0.09):
    n = int(dur * SR); tt = np.arange(n) / SR
    a = np.minimum(1.0, tt / 0.4); r = np.minimum(1.0, (dur - tt) / 0.6)
    return gain * a * r * (np.sin(2*np.pi*freq*tt) + 0.25*np.sin(2*np.pi*freq*2*tt))

def whoosh(dur=0.6, gain=0.10):
    n = int(dur * SR); tt = np.arange(n) / SR
    noise = np.random.randn(n)
    amp = np.sin(np.pi * tt / dur) ** 1.5
    y = np.zeros(n); prev = 0.0
    for i in range(n):
        cutoff = 0.04 + 0.30 * (i / n)
        prev = prev + cutoff * (noise[i] - prev)
        y[i] = prev
    return gain * amp * y * 3.0

def pop(gain=0.14):
    n = int(0.09 * SR); tt = np.arange(n) / SR
    f = 900 + 700 * np.exp(-tt * 40)
    phase = 2*np.pi*np.cumsum(f)/SR
    return gain * np.exp(-tt * 34) * np.sin(phase)

def thud(gain=0.30):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    f = 62 * np.exp(-tt * 5) + 40
    phase = 2*np.pi*np.cumsum(f)/SR
    return gain * np.exp(-tt * 7) * np.sin(phase)

NOTE = {"C4":261.63,"Eb4":311.11,"G4":392.0,"Bb4":466.16,"C5":523.25,"D5":587.33,
        "Ab3":207.65,"Eb3":155.56,"Bb2":116.54,"C3":130.81,"F4":349.23,"Ab4":415.30,
        "Bb3":233.08,"G3":196.0}
CHORDS = [  # 8s each (2 bars @ 80bpm): Cm, Ab, Eb, Bb
    {"root":"C3", "arp":["C4","Eb4","G4","Eb4","C4","G4","Bb4","G4"], "bass":"C3"},
    {"root":"Ab3","arp":["Ab4","C5","Eb4","C5","Ab4","Eb4","C4","Eb4"], "bass":"Ab3"},
    {"root":"Eb3","arp":["Eb4","G4","Bb4","G4","Eb4","Bb4","C5","Bb4"], "bass":"Eb3"},
    {"root":"Bb3","arp":["Bb4","G4","F4","G4","Bb4","C5","D5","C5"], "bass":"Bb2"},
]
PADS = [["C3","Eb4","G4"], ["Ab3","C4","Eb4"], ["Eb3","G4","Bb4"], ["Bb3","F4","Bb4"]]

# ---- section envelope: (start, end, gain) — documentary arc under VO ----
SECTIONS = [
    (0.0,   40.5,  0.55),   # problem: sparse, low
    (40.5,  53.2,  0.95),   # reveal: lift
    (53.2, 103.3,  0.85),   # product/verification: steady
    (103.3,113.9,  0.50),   # honest no: thin
    (113.9,143.6,  0.85),   # tools/spec: steady
    (143.6,157.1,  0.60),   # goal: reflective
    (157.1,170.0,  0.90),   # close: resolve
]
def sect_gain(t):
    for s, e, g in SECTIONS:
        if s <= t < e: return g
    return 0.9

# ---- pads + bass per 8s chord ----
n_chords = int(np.ceil(DUR / 8.0))
for i in range(n_chords):
    ch = CHORDS[i % 4]
    fs = [NOTE[f] for f in PADS[i % 4]]
    add(i * 8.0, pad(fs, 8.2))
    add(i * 8.0 + 0.02, bass(NOTE[ch["bass"]], 3.8, 0.08))
    add(i * 8.0 + 4.0, bass(NOTE[ch["bass"]], 3.6, 0.06))

# ---- drums: 80bpm, BEAT 0.75 ----
BEAT = 0.75
EIGHTH = BEAT / 2
t0 = 0.0
b = 0
while t0 < DUR - 1.0:
    g = sect_gain(t0)
    if t0 > 4.0:
        if b % 2 == 0 and g > 0.45:
            add(t0, kick(0.30 * g))
        add(t0, hat(0.035 * g))
        if b % 4 == 2 and g > 0.6:
            add(t0, shaker(0.05 * g))
    else:
        if b % 4 == 0: add(t0, hat(0.03))
    t0 += BEAT; b += 1

# ---- arp: 8th notes, gain follows sections ----
t0 = 4.0
idx = 0
while t0 < DUR - 4.0:
    ch = int((t0 - 4.0) // 8.0) % 4
    note = CHORDS[ch]["arp"][idx % 8]
    g = 0.11 * sect_gain(t0)
    add(t0, pluck(NOTE[note], 0.75, g))
    t0 += EIGHTH; idx += 1

# ---- scene accents (times updated after VO meta lands) ----
ACCENTS = [
    (40.85, "impact"),   # meeko-reveal slam
    (53.2,  "whoosh"),   # reveal -> real UI
    (58.4,  "pop"),      # modal click
    (82.7,  "thud"),     # verifies stamp
    (93.5,  "pop"),      # chip click
    (110.1, "low"),      # NOT FOUND dip
    (157.1, "whoosh"),   # close
]
for t, kind in ACCENTS:
    if kind == "impact":
        add(t, thud(0.34)); add(t, pluck(NOTE["C5"], 1.6, 0.16))
    elif kind == "thud":
        add(t, thud(0.30))
    elif kind == "whoosh":
        add(t, whoosh(0.6, 0.10))
    elif kind == "pop":
        add(t, pop(0.12))
    elif kind == "low":
        add(t, thud(0.20)); add(t, bass(NOTE["C3"], 2.4, 0.10))

# ---- final resolve chord at close ----
add(157.1, pad([NOTE["C3"], NOTE["Eb4"], NOTE["G4"], NOTE["C5"]], 12.5, 0.06))
add(157.1, pluck(NOTE["C5"], 3.5, 0.14)); add(157.15, pluck(NOTE["G4"], 3.8, 0.10))

# ---- master: gentle echo + normalize + fades ----
d = int(0.25 * SR)
echo = np.zeros(N); echo[d:] = mix[:-d] * 0.20
d2 = int(0.5 * SR); echo[d2:] += mix[:-d2] * 0.09
master = mix + echo
peak = np.max(np.abs(master))
master = master / peak * 0.80
fi = int(1.2 * SR); fo = int(2.5 * SR)
master[:fi] *= np.linspace(0, 1, fi)
master[-fo:] *= np.linspace(1, 0, fo)
stereo = np.stack([master, master], axis=1)

with wave.open("assets/music.wav", "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print("assets/music.wav written", len(master)/SR, "s")
