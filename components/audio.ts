
const createAudio = (src: string, loop = false): HTMLAudioElement => {
    const audio = new Audio(src);
    audio.loop = loop;
    return audio;
};

// Sound assets from royalty-free sources
const warningSound = createAudio('https://cdn.jsdelivr.net/gh/Pixel-boy/Sound-effect-archive/sound-effect-archive/sound-effects-library/digital-bleep-1-65158.mp3');
const criticalSound = createAudio('https://cdn.jsdelivr.net/gh/Pixel-boy/Sound-effect-archive/sound-effect-archive/sound-effects-library/beep-6-96243.mp3');
const evacuationSound = createAudio('https://cdn.jsdelivr.net/gh/Pixel-boy/Sound-effect-archive/sound-effect-archive/sound-effects-library/emergency-alarm-129329.mp3', true);
const clickSound = createAudio('https://cdn.jsdelivr.net/gh/Pixel-boy/Sound-effect-archive/sound-effect-archive/sound-effects-library/blip-131856.mp3');

let isMuted = false;

const playSound = (audio: HTMLAudioElement) => {
  if (isMuted) return;

  // Attempt to play the sound, handling browser restrictions
  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch(error => {
      // Autoplay was prevented. This is common before any user interaction.
      if (error.name === 'NotAllowedError') {
        console.warn('Audio playback was prevented by the browser. User interaction is required.');
      } else {
        console.error('Audio playback error:', error);
      }
    });
  }
};

export const setMuted = (muted: boolean) => {
  isMuted = muted;
  if (isMuted) {
    // If muting, stop all currently playing sounds
    evacuationSound.pause();
    evacuationSound.currentTime = 0;
  }
};

export const getIsMuted = (): boolean => isMuted;

export const playWarning = () => {
  playSound(warningSound);
};

export const playCritical = () => {
  playSound(criticalSound);
};

export const playClick = () => {
  clickSound.currentTime = 0; // Allow for rapid successive clicks
  playSound(clickSound);
};

export const startEvacuationSiren = () => {
  playSound(evacuationSound);
};

export const stopEvacuationSiren = () => {
  evacuationSound.pause();
  evacuationSound.currentTime = 0;
};
