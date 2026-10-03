// Natural Text-To-Speech (TTS) Service for Twitch Streamers
// Supports female cute anime/girl voice pronunciation with broadcaster/mod/VIP restriction

class TTSService {
  constructor() {
    this.enabled = true;
    this.volume = 0.85;
    this.modsAndVipsOnly = true; // Только стример, модераторы и VIP! Обычные зрители не могут!
    this.currentAudio = null;
    this.speechQueue = [];
    this.isPlaying = false;
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setModsAndVipsOnly(val) {
    this.modsAndVipsOnly = Boolean(val);
  }

  // Check if sender has rights to use !tts (Strict restriction)
  canUserTrigger(tags = {}, senderUsername = '', channelName = '') {
    if (!this.enabled) return false;

    const sUser = (senderUsername || '').toLowerCase();
    const cName = (channelName || '').toLowerCase();

    // Broadcaster always can
    const isBroadcaster =
      (cName && sUser === cName) ||
      tags.badges?.includes('broadcaster') ||
      tags['badges-raw']?.includes('broadcaster');
    if (isBroadcaster) return true;

    // Check Moderator
    const isMod = tags.mod === '1' || tags['user-type'] === 'mod';
    if (isMod) return true;

    // Check VIP
    const isVip =
      tags.vip === '1' ||
      tags.badges?.includes('vip') ||
      tags['badges-raw']?.includes('vip');
    if (isVip) return true;

    // Обычным зрителям запрещено!
    if (this.modsAndVipsOnly) return false;

    return false;
  }

  // Queue and speak text with sender name and female voice
  speak(text, sender = 'Чат', userRole = 'Зритель') {
    if (!this.enabled || !text) return;
    const cleanText = text.trim().slice(0, 200);
    if (!cleanText) return;

    // Озвучиваем ИМЯ + ТЕКСТ (например: "Мага говорит: всем привет!")
    const fullTextToSpeak = `${sender} говорит: ${cleanText}`;

    this.speechQueue.push({ text: fullTextToSpeak, rawText: cleanText, sender, userRole });
    this.processQueue();
  }

  processQueue() {
    if (this.isPlaying || this.speechQueue.length === 0) return;

    const item = this.speechQueue.shift();
    this.isPlaying = true;
    this.onSpeechStart?.(item);

    const finish = () => {
      this.isPlaying = false;
      this.currentAudio = null;
      this.onSpeechEnd?.();
      setTimeout(() => this.processQueue(), 300);
    };

    // Use Web Speech API for high quality female voice selection (Тяночка / Девочка)
    this.speakViaSpeechSynthesis(item.text, finish);
  }

  // High-quality Female (Тяночка) SpeechSynthesis
  speakViaSpeechSynthesis(text, onDone) {
    if (!('speechSynthesis' in window)) {
      onDone?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;
      utterance.rate = 1.08; // Слегка ускоренный бодрый девичий темп
      utterance.pitch = 1.35; // Повышенный питч для милого женского голоса (Тяночка)
      utterance.lang = 'ru-RU';

      const voices = window.speechSynthesis.getVoices();
      const ruVoices = voices.filter((v) => v.lang.startsWith('ru') || v.lang.includes('RU'));

      if (ruVoices.length > 0) {
        // Поиск лучшего женского голоса (Tatyana, Irina, Victoria, Svetlana, Google русский)
        const femaleVoice = ruVoices.find(
          (v) =>
            v.name.includes('Tatyana') ||
            v.name.includes('Irina') ||
            v.name.includes('Victoria') ||
            v.name.includes('Svetlana') ||
            v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Online')
        );
        utterance.voice = femaleVoice || ruVoices[0];
      }

      utterance.onend = () => onDone?.();
      utterance.onerror = () => onDone?.();

      window.speechSynthesis.speak(utterance);
    } catch {
      onDone?.();
    }
  }

  stop() {
    this.speechQueue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.onSpeechEnd?.();
  }
}

export const ttsService = new TTSService();
