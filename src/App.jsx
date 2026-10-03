import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wheel } from './components/Wheel';
import { StreamerPanel } from './components/StreamerPanel';
import { WinnerModal } from './components/WinnerModal';
import { ObsOverlay } from './components/ObsOverlay';
import { TwitchAuthModal } from './components/TwitchAuthModal';
import { TwitchIrcClient } from './services/twitchIrc';
import { TwitchEventSubClient } from './services/twitchEventSub';
import { syncService } from './services/syncChannel';
import { sound } from './services/sound';
import { ttsService } from './services/ttsService';
import { Megaphone, Volume2, VolumeX, Copy, Check, LogIn, Sparkles, Trophy } from 'lucide-react';

export default function App() {
  const isObsMode = new URLSearchParams(window.location.search).get('obs') === 'true';
  if (isObsMode) return <ObsOverlay />;

  const [channelName, setChannelName] = useState(() => localStorage.getItem('__twitch_channel') || '');
  const [chatStatus, setChatStatus] = useState('disconnected');
  const [twitchToken, setTwitchToken] = useState(() => localStorage.getItem('__twitch_access_token') || '');
  const [twitchUser, setTwitchUser] = useState(() => {
    try {
      const saved = localStorage.getItem('__twitch_user_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [clientId, setClientId] = useState(() => localStorage.getItem('__twitch_client_id') || 'kimne78kx3ncx6brgo4mv6wki5h1ko');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isIntegrationActive, setIsIntegrationActive] = useState(false);

  const [enableChatKeyword, setEnableChatKeyword] = useState(true);
  const [keyword, setKeyword] = useState(() => localStorage.getItem('__twitch_keyword') || 'го');
  const [enableChannelPoints, setEnableChannelPoints] = useState(true);
  const [rewardsList, setRewardsList] = useState([]);
  const [selectedRewardId, setSelectedRewardId] = useState('ALL');

  const [participants, setParticipants] = useState(() => {
    try {
      const saved = localStorage.getItem('__twitch_wheel_participants');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [spinDuration, setSpinDuration] = useState(8000);
  const [autoRemoveWinner, setAutoRemoveWinner] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);

  // Тян-TTS уведомление
  const [activeTts, setActiveTts] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    ttsService.setEnabled(ttsEnabled);
    ttsService.onSpeechStart = (item) => setActiveTts(item);
    ttsService.onSpeechEnd = () => setActiveTts(null);
  }, [ttsEnabled]);

  const ircClientRef = useRef(null);
  const eventSubClientRef = useRef(null);
  const participantsRef = useRef(participants);
  participantsRef.current = participants;
  const keywordRef = useRef(keyword);
  useEffect(() => { keywordRef.current = keyword; }, [keyword]);

  const updateParticipants = useCallback((newList) => {
    setParticipants(newList);
    try {
      localStorage.setItem('__twitch_wheel_participants', JSON.stringify(newList));
    } catch {}
    syncService.send('UPDATE_PARTICIPANTS', { participants: newList });
  }, []);

  useEffect(() => { if (channelName) localStorage.setItem('__twitch_channel', channelName); }, [channelName]);
  useEffect(() => { if (keyword) localStorage.setItem('__twitch_keyword', keyword); }, [keyword]);
  useEffect(() => { if (clientId) localStorage.setItem('__twitch_client_id', clientId); }, [clientId]);

  useEffect(() => {
    sound.setEnabled(soundEnabled);
    sound.setVolume(soundVolume);
    sound.setVoiceoverEnabled(voiceoverEnabled);
    syncService.send('UPDATE_SETTINGS', { soundEnabled, soundVolume, voiceoverEnabled });
  }, [soundEnabled, soundVolume, voiceoverEnabled]);

  useEffect(() => {
    return syncService.subscribe((msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === 'OBS_SPIN_FINISHED') {
        setIsSpinning(false);
        setWinner(msg.payload.winner);
      } else if (msg.type === 'REMOVE_WINNER') {
        const nameRem = msg.payload.winner?.name || msg.payload.winner;
        updateParticipants(participantsRef.current.filter(p => (p.name || p).toLowerCase() !== nameRem.toLowerCase()));
      } else if (msg.type === 'RESET_WINNER') {
        setWinner(null);
      }
    });
  }, [updateParticipants]);

  const handleAddParticipant = useCallback((name, source = 'manual', details = {}) => {
    if (!name) return;
    const clean = name.trim();
    if (participantsRef.current.find(p => (p.name || p).toLowerCase() === clean.toLowerCase())) return;
    const updated = [...participantsRef.current, { name: clean, tickets: 1, source, ...details }];
    updateParticipants(updated);
    sound.playJoin();
  }, [updateParticipants]);

  const handleRemoveParticipant = useCallback((nameRem) => {
    const updated = participantsRef.current.filter(p => (p.name || p).toLowerCase() !== nameRem.toLowerCase());
    updateParticipants(updated);
  }, [updateParticipants]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleTokenSuccess = useCallback((profile) => {
    if (!profile) return;
    setTwitchToken(profile.token);
    setTwitchUser(profile);
    if (profile.clientId) {
      setClientId(profile.clientId);
      localStorage.setItem('__twitch_client_id', profile.clientId);
    }
    localStorage.setItem('__twitch_access_token', profile.token);
    localStorage.setItem('__twitch_user_info', JSON.stringify(profile));
    if (profile.login && !channelName) setChannelName(profile.login);
  }, [channelName]);

  useEffect(() => {
    const token = TwitchEventSubClient.parseTokenFromHash();
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      setIsAuthLoading(true);
      TwitchEventSubClient.authenticateWithToken(token).then((profile) => {
        handleTokenSuccess(profile);
        setIsAuthLoading(false);
      }).catch(() => setIsAuthLoading(false));
    }
  }, [handleTokenSuccess]);

  const handleLoginTwitch = () => {
    window.location.href = TwitchEventSubClient.getAuthUrl(clientId);
  };

  const handleLogoutTwitch = () => {
    setTwitchToken('');
    setTwitchUser(null);
    setIsIntegrationActive(false);
    localStorage.removeItem('__twitch_access_token');
    localStorage.removeItem('__twitch_user_info');
    if (ircClientRef.current) ircClientRef.current.disconnect();
    if (eventSubClientRef.current) eventSubClientRef.current.disconnect();
  };

  const handleToggleIntegration = async () => {
    const targetChannel = (twitchUser?.login || channelName || '').trim().toLowerCase();
    if (!targetChannel) {
      alert('Укажите ник твич-канала для подключения!');
      return;
    }
    const nextState = !isIntegrationActive;
    setIsIntegrationActive(nextState);

    if (nextState) {
      sound.playWin();
      if (enableChatKeyword && targetChannel) {
        ircClientRef.current = new TwitchIrcClient({
          onMessage: ({ displayName, message, tags = {}, username = '' }) => {
            const cleanMsg = (message || '').trim();
            if (/^!(tts|озвучка)\s+/i.test(cleanMsg)) {
              const text = cleanMsg.replace(/^!(tts|озвучка)\s+/i, '').trim();
              if (ttsService.canUserTrigger(tags, username, targetChannel) && text) {
                const isMod = tags.mod === '1';
                const isVip = tags.vip === '1' || tags.badges?.includes('vip');
                const role = isMod ? 'Модератор' : isVip ? 'VIP' : 'Зритель';
                ttsService.speak(text, displayName, role);
              }
            }
            const words = (keywordRef.current || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
            if (words.some(w => cleanMsg.toLowerCase() === w || cleanMsg.toLowerCase().includes(w))) {
              handleAddParticipant(displayName, 'chat_keyword');
            }
          },
          onStatusChange: (status) => setChatStatus(status),
        });
        ircClientRef.current.connect(targetChannel);
      }
    } else {
      if (ircClientRef.current) {
        ircClientRef.current.disconnect();
        setChatStatus('disconnected');
      }
    }
  };

  const handleSpin = () => {
    if (isSpinning || participants.length === 0) return;
    setWinner(null);
    setIsSpinning(true);
    syncService.send('START_SPIN', { spinDuration });
  };

  const handleSpinEnd = (winning) => {
    setIsSpinning(false);
    setWinner(winning);
    if (autoRemoveWinner) {
      setTimeout(() => handleRemoveParticipant(winning.name || winning), 1500);
    }
  };

  const [copiedObs, setCopiedObs] = useState(false);
  const obsUrl = `${window.location.origin}${window.location.pathname}?obs=true`;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 lg:p-8 flex flex-col items-center">
      {activeTts && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900/95 border border-purple-500/50 shadow-2xl rounded-2xl text-xs">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center animate-pulse">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-purple-300 font-mono">[{activeTts.userRole}] {activeTts.sender}:</span>
            <span className="text-white text-sm max-w-sm break-words">«{activeTts.text}»</span>
          </div>
        </div>
      )}

      <header className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">MAGA STREAM ROULETTE</h1>
            <p className="text-xs text-zinc-400 font-medium">Прокачки • Аукционы • Тян-TTS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => ttsService.speak('Привет от стрима Маги! Тян-TTS озвучка работает отлично.', 'Maga', 'Стример')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/40 border border-purple-800/60 rounded-xl transition-all"
          >
            <Megaphone className="w-3.5 h-3.5 text-purple-400" />
            <span>Тест !tts</span>
          </button>

          {twitchUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white">{twitchUser.displayName}</span>
              <button onClick={handleLogoutTwitch} className="ml-1 text-zinc-500 hover:text-rose-400 text-xs">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-xl text-xs text-purple-200 font-semibold"
            >
              <LogIn className="w-3.5 h-3.5 text-purple-300" />
              <span>Войти через Twitch</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(obsUrl);
              setCopiedObs(true);
              setTimeout(() => setCopiedObs(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all"
          >
            {copiedObs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedObs ? 'Скопировано' : 'OBS Виджет'}
          </button>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row items-center justify-center gap-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          <div className="relative p-6 rounded-3xl glass-panel shadow-2xl">
            <Wheel
              participants={participants}
              isSpinning={isSpinning}
              spinDuration={spinDuration}
              onSpinEnd={handleSpinEnd}
              size={520}
            />
          </div>
        </div>

        <div className="flex justify-center w-full lg:w-auto">
          <StreamerPanel
            channelName={channelName}
            setChannelName={setChannelName}
            chatStatus={chatStatus}
            twitchUser={twitchUser}
            isAuthLoading={isAuthLoading}
            onLoginTwitch={() => setIsAuthModalOpen(true)}
            onLogoutTwitch={handleLogoutTwitch}
            clientId={clientId}
            setClientId={setClientId}
            isIntegrationActive={isIntegrationActive}
            onToggleIntegration={handleToggleIntegration}
            keyword={keyword}
            setKeyword={setKeyword}
            enableChatKeyword={enableChatKeyword}
            setEnableChatKeyword={setEnableChatKeyword}
            enableChannelPoints={enableChannelPoints}
            setEnableChannelPoints={setEnableChannelPoints}
            rewardsList={rewardsList}
            selectedRewardId={selectedRewardId}
            setSelectedRewardId={setSelectedRewardId}
            participants={participants}
            onAddParticipant={handleAddParticipant}
            onRemoveParticipant={handleRemoveParticipant}
            onClearParticipants={() => updateParticipants([])}
            onShuffleParticipants={() => updateParticipants([...participants].sort(() => Math.random() - 0.5))}
            isSpinning={isSpinning}
            onSpin={handleSpin}
            autoRemoveWinner={autoRemoveWinner}
            setAutoRemoveWinner={setAutoRemoveWinner}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            voiceoverEnabled={voiceoverEnabled}
            setVoiceoverEnabled={setVoiceoverEnabled}
          />
        </div>
      </main>

      {winner && (
        <WinnerModal
          winner={winner}
          onClose={() => setWinner(null)}
          onRemoveWinner={(w) => handleRemoveParticipant(w.name || w)}
          onSpinAgain={handleSpin}
        />
      )}

      <TwitchAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        clientId={clientId}
        setClientId={setClientId}
        onLoginOAuth={handleLoginTwitch}
        onTokenSuccess={handleTokenSuccess}
      />
    </div>
  );
}
