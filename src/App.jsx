import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Users, Play, Sparkles, ShieldCheck, Zap, Trash2, Plus, MessageSquare, Volume2 } from 'lucide-react';

export default function App() {
  const [participants, setParticipants] = useState([
    'Мага_Брат', 'Руфат_Кинг', 'СтримерПро', 'ЗрительУдачи'
  ]);
  const [newParticipant, setNewParticipant] = useState('');
  const [isRotating, setIsRotating] = useState(false);
  const [winner, setWinner] = useState(null);
  const [token, setToken] = useState('');
  const [ttsActive, setTtsActive] = useState(false);
  const [statusLog, setStatusLog] = useState(['🎨 Система запущена с анимациями и Тян-TTS!']);

  const addLog = (msg) => {
    setStatusLog(prev => [msg, ...prev.slice(0, 5)]);
  };

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (accessToken) {
      setToken(accessToken);
      addLog('✅ Авторизация Twitch успешна!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const enableTTS = () => {
    setTtsActive(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Тян озвучка активирована!");
      u.lang = 'ru-RU';
      u.pitch = 1.6;
      window.speechSynthesis.speak(u);
    }
    addLog('🔊 Тян-TTS разблокирован!');
  };

  // Слушатель Twitch чата для !tts от модераторов/випов
  useEffect(() => {
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    ws.onopen = () => {
      ws.send('PASS oauth:justinfan12345');
      ws.send('NICK justinfan12345');
      ws.send('JOIN #maga_work');
    };

    ws.onmessage = (event) => {
      const msg = event.data;
      if (msg.includes('PRIVMSG')) {
        const tagsMatch = msg.match(/^@([^ ]+) /);
        const userMatch = msg.match(/:([^!]+)!/);
        const textMatch = msg.match(/PRIVMSG #[^ ]+ :(.+)/);

        if (userMatch && textMatch) {
          const rawTags = tagsMatch ? tagsMatch[1] : '';
          const username = userMatch[1];
          const text = textMatch[1].trim();
          const isMod = rawTags.includes('mod=1') || rawTags.includes('badges=moderator') || rawTags.includes('badges=broadcaster') || rawTags.includes('badges=vip');

          if (text.startsWith('!tts') && isMod) {
            const ttsMsg = text.replace('!tts', '').trim();
            if (ttsMsg) {
              addLog(`🗣 [Модер/ВИП] ${username}: "${ttsMsg}"`);
              if (ttsActive && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(`${username} говорит: ${ttsMsg}`);
                utterance.lang = 'ru-RU';
                utterance.pitch = 1.6; // Голос тян
                utterance.rate = 1.05;
                window.speechSynthesis.speak(utterance);
              }
            }
          }
        }
      }
    };
    return () => ws.close();
  }, [ttsActive]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newParticipant.trim()) return;
    setParticipants(prev => [...prev, newParticipant.trim()]);
    setNewParticipant('');
  };

  const handleRemove = (index) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const simulateOnePoint = () => {
    const name = `Зритель_${Math.floor(Math.random() * 900 + 100)}`;
    setParticipants(prev => [...prev, name]);
    addLog(`💎 ${name} купил слот за 1 балл!`);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  };

  const spinWheel = () => {
    if (participants.length === 0 || isRotating) return;
    setIsRotating(true);
    setWinner(null);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * participants.length);
      const chosen = participants[randomIndex];
      setWinner(chosen);
      setIsRotating(false);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      addLog(`🎉 Победитель: ${chosen}!`);
    }, 3000);
  };

  const loginTwitch = () => {
    const clientId = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
    const redirect = window.location.origin;
    window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=chat:read`;
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-100 p-4 md:p-8 font-sans">
      
      {!ttsActive && (
        <div className="max-w-6xl mx-auto mb-4 bg-amber-500 text-black border border-amber-400 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="font-bold text-sm">⚠️ Нажми кнопку, чтобы разблокировать Тян-TTS озвучку!</div>
          <button onClick={enableTTS} className="bg-black text-amber-300 px-5 py-2 rounded-xl font-bold hover:bg-zinc-900 cursor-pointer text-sm">
            🔊 Включить TTS звук
          </button>
        </div>
      )}

      <header className="max-w-6xl mx-auto bg-[#121215] border border-[#27272a] rounded-3xl p-6 mb-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-2xl shadow-lg">
            <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              MAGA STREAM ROULETTE
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm font-medium">Аукцион за 1 балл • Тян-TTS для модераторов</p>
          </div>
        </div>

        <div>
          {token ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 rounded-2xl text-emerald-400 font-semibold text-sm">
              <ShieldCheck className="w-5 h-5" /> Twitch Подключен
            </div>
          ) : (
            <button
              onClick={loginTwitch}
              className="bg-white text-black font-bold px-6 py-3 rounded-2xl shadow-lg hover:bg-zinc-200 transition text-sm flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" /> Войти через Twitch
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-sm font-semibold text-zinc-300">💎 Аукцион за 1 балл:</span>
            <button
              onClick={simulateOnePoint}
              className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer"
            >
              🧪 Тест списания 1 балла
            </button>
          </div>

          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-200">
            <Users className="w-5 h-5 text-zinc-400" /> Участники ({participants.length})
          </h2>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newParticipant}
              onChange={(e) => setNewParticipant(e.target.value)}
              placeholder="Добавить зрителя..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-sm"
            />
            <button type="submit" className="bg-white hover:bg-zinc-200 text-black p-2.5 rounded-xl font-bold cursor-pointer">
              <Plus className="w-5 h-5" />
            </button>
          </form>

          <div className="flex-1 max-h-48 overflow-y-auto space-y-2 pr-1">
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 px-4 py-2 rounded-xl text-sm">
                <span className="truncate max-w-[160px] text-zinc-200 font-medium">{p}</span>
                <button onClick={() => handleRemove(idx)} className="text-zinc-500 hover:text-rose-400 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="text-center mb-6 z-10">
              <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {winner ? `🏆 Победитель: ${winner}` : isRotating ? '🌀 Колесо крутится...' : '🎯 Готово к вращению!'}
              </h3>
            </div>

            <div className={`w-64 h-64 md:w-80 md:h-80 rounded-full border-8 border-zinc-800 bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center shadow-2xl transition-transform duration-3000 ${isRotating ? 'rotate-[1440deg] scale-105' : 'scale-100'} z-10`}>
              <div className="text-center p-4 bg-[#09090b] rounded-full w-48 h-48 flex flex-col items-center justify-center border-4 border-zinc-800">
                <span className="text-3xl font-black text-white">{participants.length}</span>
                <span className="text-xs text-zinc-400 font-medium mt-1">участников</span>
              </div>
            </div>

            <button
              onClick={spinWheel}
              disabled={isRotating || participants.length === 0}
              className="mt-8 z-10 bg-white hover:bg-zinc-200 text-black font-bold text-lg px-10 py-3.5 rounded-2xl shadow-xl transition disabled:opacity-40 flex items-center gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" /> Крутить колесо!
            </button>
          </div>

          <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" /> Лог событий и !tts озвучки:
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {statusLog.map((log, index) => (
                <div key={index} className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs font-mono text-zinc-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
