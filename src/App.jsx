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
  const [ttsList, setTtsList] = useState([]);
  
  // Состояние бота кодового слова
  const [keyword, setKeyword] = useState('+');
  const [isBotActive, setIsBotActive] = useState(false);
  const [statusLog, setStatusLog] = useState(['🎨 Яркий разноцветный интерфейс загружен!']);

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

  // Разблокировка браузерного аудио для Тян-TTS
  const enableTTS = () => {
    setTtsActive(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Тян озвучка активирована!");
      u.lang = 'ru-RU';
      u.pitch = 1.6;
      window.speechSynthesis.speak(u);
    }
    addLog('🔊 Тян-TTS успешно разблокирован!');
  };

  // Подключение к Twitch чату для бота кодового слова и !tts
  useEffect(() => {
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    ws.onopen = () => {
      ws.send('PASS oauth:justinfan12345');
      ws.send('NICK justinfan12345');
      ws.send('JOIN #maga_work');
      addLog('💬 Подключено к Twitch чату.');
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

          // 1. Бот кодового слова для прокачек
          if (isBotActive && text.toLowerCase() === keyword.toLowerCase()) {
            setParticipants(prev => {
              if (!prev.includes(username)) {
                addLog(`🤖 Бот добавил зрителя: ${username}`);
                return [...prev, username];
              }
              return prev;
            });
          }

          // 2. Команда !tts для модераторов / випов
          if (text.startsWith('!tts') && isMod) {
            const ttsMsg = text.replace('!tts', '').trim();
            if (ttsMsg) {
              addLog(`🗣 [Модер/ВИП] ${username}: "${ttsMsg}"`);
              setTtsList(prev => [{ user: username, text: ttsMsg }, ...prev.slice(0, 10)]);

              if (ttsActive && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(`${username} говорит: ${ttsMsg}`);
                utterance.lang = 'ru-RU';
                utterance.pitch = 1.6; // Тонкий голос тян
                utterance.rate = 1.05;
                window.speechSynthesis.speak(utterance);
              }
            }
          }
        }
      }
    };

    return () => ws.close();
  }, [isBotActive, keyword, ttsActive]);

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
      addLog(`🎉 Победитель раунда: ${chosen}!`);
    }, 3000);
  };

  const loginTwitch = () => {
    const clientId = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
    const redirect = window.location.origin;
    window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=chat:read`;
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #4f00bc 0%, #ff007f 50%, #00ffff 100%)', minHeight: '100vh', color: '#ffffff' }} className="p-4 md:p-8 font-sans">
      
      {/* Баннер разблокировки звука */}
      {!ttsActive && (
        <div className="max-w-6xl mx-auto mb-4 bg-yellow-400 text-black border-4 border-black p-4 rounded-2xl shadow-2xl flex items-center justify-between">
          <div className="font-black text-sm md:text-base">⚠️ Нажми кнопку, чтобы браузер разблокировал Тян-TTS озвучку!</div>
          <button onClick={enableTTS} className="bg-black text-yellow-300 px-6 py-2 rounded-xl font-black hover:bg-gray-900 cursor-pointer border-2 border-yellow-300">
            🔊 Включить TTS звук
          </button>
        </div>
      )}

      {/* Шапка */}
      <header className="max-w-6xl mx-auto bg-black/40 backdrop-blur-lg border-2 border-pink-500/50 rounded-3xl p-6 mb-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-yellow-400 to-pink-500 p-3 rounded-2xl shadow-lg">
            <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 drop-shadow">
              MAGA STREAM ROULETTE
            </h1>
            <p className="text-pink-300 text-xs md:text-sm font-bold">1 балл = 1 билет • Бот кодового слова • Тян-TTS для модераторов</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <div className="flex items-center gap-2 bg-emerald-500/30 border-2 border-emerald-400 px-4 py-2 rounded-2xl text-emerald-200 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-300" /> Twitch Подключен
            </div>
          ) : (
            <button
              onClick={loginTwitch}
              className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 font-black px-6 py-3 rounded-2xl shadow-xl border-2 border-yellow-300 text-black cursor-pointer hover:scale-105 transition text-sm flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-black" /> Войти через Twitch
            </button>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Левая колонка: Управление, Бот и Баллы */}
        <div className="bg-black/40 backdrop-blur-lg border-2 border-cyan-400/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          
          {/* Блок бота кодового слова */}
          <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border-2 border-cyan-400/60 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-black text-cyan-300 flex items-center gap-2">
              🤖 Бот сбора по кодовому слову
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-300 font-semibold">Кодовое слово:</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-black/60 border border-pink-400/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
            <button
              onClick={() => setIsBotActive(!isBotActive)}
              className={`w-full font-black py-2 rounded-xl text-xs cursor-pointer shadow transition ${isBotActive ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}
            >
              {isBotActive ? '⏹ Остановить сбор' : '▶ Запустить сбор из чата'}
            </button>
            <div className="text-center text-xs font-bold text-yellow-300">
              Статус: {isBotActive ? '🟢 Активен (слушает чат)' : '🔴 Остановлен'}
            </div>
          </div>

          {/* Аукцион за 1 балл */}
          <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border-2 border-purple-400/50 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-sm font-bold text-yellow-300">💎 Аукцион за 1 балл:</span>
            <button
              onClick={simulateOnePoint}
              className="w-full bg-gradient-to-r from-pink-500 to-yellow-400 hover:opacity-90 text-black font-black py-2.5 rounded-xl text-sm shadow cursor-pointer"
            >
              🧪 Тест списания 1 балла
            </button>
          </div>

          <h2 className="text-xl font-extrabold flex items-center gap-2 text-cyan-300">
            <Users className="w-5 h-5" /> Участники ({participants.length})
          </h2>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newParticipant}
              onChange={(e) => setNewParticipant(e.target.value)}
              placeholder="Добавить зрителя..."
              className="flex-1 bg-black/60 border-2 border-pink-400/60 rounded-xl px-4 py-2 text-white placeholder-pink-300 focus:outline-none text-sm font-medium"
            />
            <button type="submit" className="bg-cyan-400 hover:opacity-90 p-2.5 rounded-xl font-bold cursor-pointer text-black">
              <Plus className="w-5 h-5" />
            </button>
          </form>

          <div className="flex-1 max-h-48 overflow-y-auto space-y-2 pr-1">
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/10 border border-white/25 px-4 py-2 rounded-xl text-sm font-bold">
                <span className="truncate max-w-[160px] text-yellow-200">{p}</span>
                <button onClick={() => handleRemove(idx)} className="text-pink-400 hover:text-red-400 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Центр / Правая колонка: Колесо и логи */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          <div className="bg-black/40 backdrop-blur-lg border-2 border-yellow-400/50 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="text-center mb-6 z-10">
              <h3 className="text-2xl md:text-3xl font-black text-yellow-300 drop-shadow-lg">
                {winner ? `🏆 Победитель: ${winner}` : isRotating ? '🌀 Колесо крутится...' : '🎯 Готово к вращению!'}
              </h3>
            </div>

            <div className={`w-64 h-64 md:w-80 md:h-80 rounded-full border-8 border-cyan-400 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-2xl transition-transform duration-3000 ${isRotating ? 'rotate-[1440deg] scale-105' : 'scale-100'} z-10`}>
              <div className="text-center p-4 bg-black/50 rounded-full w-48 h-48 flex flex-col items-center justify-center border-4 border-yellow-300">
                <span className="text-2xl font-black text-white drop-shadow">
                  {participants.length}
                </span>
                <span className="text-xs text-pink-300 font-bold mt-1">участников</span>
              </div>
            </div>

            <button
              onClick={spinWheel}
              disabled={isRotating || participants.length === 0}
              className="mt-8 z-10 bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-300 hover:opacity-90 text-black font-black text-xl px-10 py-4 rounded-2xl shadow-2xl transition disabled:opacity-50 flex items-center gap-3 cursor-pointer border-2 border-white"
            >
              <Play className="w-6 h-6 fill-current" /> Крутить колесо!
            </button>
          </div>

          {/* Логи и Тян-TTS */}
          <div className="bg-black/55 backdrop-blur-lg border-2 border-pink-500/50 rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-black text-cyan-300 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Лог событий и !tts озвучки (Тян-голос):
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {statusLog.map((log, index) => (
                <div key={index} className="bg-white/10 border border-pink-400/40 px-3 py-2 rounded-xl text-xs font-semibold text-white">
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
