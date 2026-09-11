"""Original Townies trailer composition, arranged as a seamless 54-second game loop.

Requires NumPy. Writes a temporary WAV; encode to public/audio/townies-daylight-v1.mp3.
No action sound effects are baked into the music. Note tails wrap across the loop.
"""
import math
import wave
from pathlib import Path
import numpy as np

rate = 48000
length = 54
n = rate * length
mix = np.zeros((n, 2), dtype=np.float64)
rng = np.random.default_rng(63)

def place(signal, start, volume=.1, pan=0):
    stereo = signal[:, None] * volume * np.array([math.sqrt((1-pan)/2), math.sqrt((1+pan)/2)])
    index = round(start * rate) % n
    first = min(len(signal), n-index)
    mix[index:index+first] += stereo[:first]
    if first < len(signal):
        mix[:len(signal)-first] += stereo[first:]

def note(midi, start, duration=.8, volume=.1, pan=0, bass=False):
    t = np.arange(round(duration*rate))/rate
    freq = 440 * 2**((midi-69)/12)
    if bass:
        signal = np.sin(2*np.pi*freq*t) * np.exp(-t*4)
    else:
        signal = (np.sin(2*np.pi*freq*t) + .28*np.sin(4*np.pi*freq*t) + .09*np.sin(6*np.pi*freq*t)) * np.exp(-t*5)
    signal *= np.minimum(t/.008, 1) * np.minimum((duration-t)/.05, 1)
    place(signal, start, volume, pan)

beat = 27/48
chords = [[60,64,67,71], [57,60,64,67], [53,57,60,64], [55,59,62,67]]
for bar in range(24):
    chord = chords[bar % 4]
    start = bar * 4 * beat
    for j in range(8):
        note(chord[[0,2,1,3,2,1,3,2][j]]+12, start+j*beat/2, .85, .072, -.25 if j % 2 else .25)
    for j in [0,2]:
        note(chord[0]-12, start+j*beat, 1.1, .15, 0, True)
    for j in range(4):
        t = np.arange(round(.09*rate))/rate
        noise = np.diff(rng.normal(size=len(t)), prepend=0)
        place(noise*np.exp(-t*65), start+j*beat+beat/2, .011, .4)

melody = [76,79,81,79,76,74,72,74,76,79,76,74,72,69,72,74]
for k, midi in enumerate(melody):
    note(midi, 4.5+k*beat, 1.1, .095, -.12)
for k, midi in enumerate([76,79,81,79,76,74,72,74,79,76,74,72,69,72,74,71]):
    note(midi, 31.5+k*beat, 1.1, .085, .12)

mix *= .65 / np.max(np.abs(mix))
# A four-millisecond taper keeps the lossy encoder's seam quiet as well.
edge = round(.004 * rate)
taper = (.5 - .5 * np.cos(np.linspace(0, np.pi, edge)))[:, None]
mix[:edge] *= taper
mix[-edge:] *= taper[::-1]
assert np.max(np.abs(mix[0]-mix[-1])) < .002, 'Loop boundary clicks'
path = Path('outputs/audio/townies-daylight.wav')
path.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(path), 'wb') as file:
    file.setnchannels(2)
    file.setsampwidth(2)
    file.setframerate(rate)
    file.writeframes((mix*32767).astype('<i2').tobytes())
print(f'Created {path}: {length}s, seamless stereo loop, no embedded delivery effects.')
