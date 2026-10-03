import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wheel } from './components/Wheel';
import { StreamerPanel } from './components/StreamerPanel';
import { WinnerModal } from './components/WinnerModal';
import { ObsOverlay } from './components/ObsOverlay';
import { CarryRollView } from './components/CarryRollView';
import { AuctionTopBoard } from './components/AuctionTopBoard';
import { LotAuctionView } from './components/LotAuctionView';
import { TwitchIrcClient } from './services/twitchIrc';
import { TwitchEventSubClient } from './services/twitchEventSub';
import { syncService } from './services/syncChannel';
import { sound } from './services/sound';
import { ttsService } from './services/ttsService';
import { TwitchAuthModal } from './components/TwitchAuthModal';
import { Shuffle, Gift, Volume2, VolumeX, Copy, Check, Megaphone, Coins, Sparkles, LogIn } from 'lucide-react';

export default function App() {
  // Check if opened as OBS browser source overlay
  const isObsMode = new URLSearchParams(window.location.search).get('obs') === 'true';

  if (isObsMode) {
    return <ObsOverlay />;
  }

  // --- Twitch Authentication & User State ---
  const [channelName, setChannelName] = useState(() => {
    return localStorage.getItem('__twitch_channel') || '';
  });
  const [chatStatus, setChatStatus] = useState('disconnected');

  const [twitchToken, setTwitchToken] = useState(() => {
    return localStorage.getItem('__twitch_access_token') || '';
  });

  const [twitchUser, setTwitchUser] = useState(() => {
    try {
      const saved = localStorage.getItem('__twitch_user_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem('__twitch_client_id') || 'kimne78kx3ncx6brgo4mv6wki5h1ko';
  });

  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- Master Integration State (ВКЛЮЧИТЬ / ВЫКЛЮЧИТЬ ИНТЕГРАЦИЮ) ---
  const [isIntegrationActive, setIsIntegrationActive] = useState(false);

  // Modes config
  const [enableChatKeyword, setEnableChatKeyword] = useState(true);
  const [keyword, setKeyword] = useState(() => {
    return localStorage.getItem('__twitch_keyword') || 'го';
  });

  const [enableChannelPoints, setEnableChannelPoints] = useState(true);
  const [rewardsList, setRewardsList] = useState([]);
  const [selectedRewardId, setSelectedRewardId] = useState('ALL');

  // Participants in wheel
  const [participants, setParticipants] = useState(() => {
    try {
      const saved = localStorage.getItem('__twitch_wheel_participants');
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = (parsed || []).filter(
          (p) => !['StreamerFan', 'Alex_Pro', 'CyberGamer'].includes(p.name || p)
        );
        return filtered;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [spinDuration, setSpinDuration] = useState(8000);
  const [autoRemoveWinner, setAutoRemoveWinner] = useState(false);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false); // Disabled by default per request

  // Sections/Modes: 'carry' (Прокачки - быстрый ролл) vs 'auction' (Аукцион - по шансам)
  const [appMode, setAppMode] = useState('carry');
  const [ticketsPerEntry, setTicketsPerEntry] = useState(1);
  const ticketsPerEntryRef = useRef(ticketsPerEntry);
  useEffect(() => {
    ticketsPerEntryRef.current = ticketsPerEntry;
  }, [ticketsPerEntry]);

  // Chances & Tickets mode ("Колесо по шансам")
  const [allowMultipleTickets, setAllowMultipleTickets] = useState(false); // default false for 'carry'

  const handleSetAppMode = (mode) => {
    setAppMode(mode);
    if (mode === 'carry') {
      setAllowMultipleTickets(false);
    } else {
      setAllowMultipleTickets(true);
    }
  };

  // Winner response tracking in Twitch chat
  const [winnerResponse, setWinnerResponse] = useState(null);
  const [responseSecondsLeft, setResponseSecondsLeft] = useState(60);
  const responseTimerIntervalRef = useRef(null);
  const winnerRef = useRef(winner);
  winnerRef.current = winner;
  const winnerResponseRef = useRef(winnerResponse);
  winnerResponseRef.current = winnerResponse;

  // Twitch Chat TTS (!tts command for mods & vips)
  const [activeTts, setActiveTts] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    ttsService.setEnabled(ttsEnabled);
    ttsService.onSpeechStart = (item) => setActiveTts(item);
    ttsService.onSpeechEnd = () => setActiveTts(null);
  }, [ttsEnabled]);

  // Client references & refs to prevent stale closure bugs
  const ircClientRef = useRef(null);
  const eventSubClientRef = useRef(null);
  const participantsRef = useRef(participants);
  participantsRef.current = participants;

  const keywordRef = useRef(keyword);
  useEffect(() => {
    keywordRef.current = keyword;
  }, [keyword]);

  const allowMultipleTicketsRef = useRef(allowMultipleTickets);
  useEffect(() => {
    allowMultipleTicketsRef.current = allowMultipleTickets;
  }, [allowMultipleTickets]);

  // Persist participants & broadcast to OBS
  const updateParticipants = useCallback((newList) => {
    setParticipants(newList);
    try {
      localStorage.setItem('__twitch_wheel_participants', JSON.stringify(newList));
    } catch {}
    syncService.send('UPDATE_PARTICIPANTS', { participants: newList });
  }, []);

  // Save persistent configs
  useEffect(() => {
    if (channelName) localStorage.setItem('__twitch_channel', channelName);
  }, [channelName]);

  useEffect(() => {
    if (keyword) localStorage.setItem('__twitch_keyword', keyword);
  }, [keyword]);

  useEffect(() => {
    if (clientId) localStorage.setItem('__twitch_client_id', clientId);
  }, [clientId]);

  useEffect(() => {
    sound.setEnabled(soundEnabled);
    sound.setVolume(soundVolume);
    sound.setVoiceoverEnabled(voiceoverEnabled);
    syncService.send('UPDATE_SETTINGS', { soundEnabled, soundVolume, voiceoverEnabled });
  }, [soundEnabled, soundVolume, voiceoverEnabled]);

  // Synchronize incoming events from OBS Overlay
  useEffect(() => {
    const unsub = syncService.subscribe((msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === 'OBS_SPIN_FINISHED') {
        setIsSpinning(false);
        setWinner(msg.payload.winner);
      } else if (msg.type === 'REMOVE_WINNER') {
        handleRemoveParticipant(msg.payload.winner?.name || msg.payload.winner);
      } else if (msg.type === 'RESET_WINNER') {
        setWinner(null);
      }
    });
    return unsub;
  }, []);

  // --- Add Participant logic (with multiple tickets / chances support) ---
  const handleAddParticipant = useCallback(
    (name, source = 'manual', details = {}) => {
      if (!name) return;
      const cleanName = name.trim();
      const existingIdx = participantsRef.current.findIndex(
        (p) => (p.name || p).toLowerCase() === cleanName.toLowerCase()
      );

      const addedTickets = allowMultipleTicketsRef.current ? (ticketsPerEntryRef.current || 1) : 1;

      if (existingIdx !== -1) {
        if (allowMultipleTicketsRef.current) {
          // Increment tickets (+addedTickets билетов/баллов)
          const updated = [...participantsRef.current];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            tickets: (curr.tickets || 1) + addedTickets,
            source,
            ...details,
          };
          updateParticipants(updated);
          sound.playJoin();
        }
        return;
      }

      // New participant
      const newParticipant = {
        name: cleanName,
        tickets: addedTickets,
        source,
        ...details,
      };

      const updated = [...participantsRef.current, newParticipant];
      updateParticipants(updated);
      sound.playJoin();
    },
    [updateParticipants]
  );

  // Direct ticket setting ( streamer writes 5 or 10 directly )
  const handleSetTickets = useCallback(
    (name, count) => {
      const parsed = Math.max(1, parseInt(count, 10) || 1);
      const updated = participantsRef.current.map((p) => {
        if ((p.name || p).toLowerCase() === name.toLowerCase()) {
          return { ...p, tickets: parsed };
        }
        return p;
      });
      updateParticipants(updated);
    },
    [updateParticipants]
  );

  // Manual ticket adjustment (+ / - билеты)
  const handleUpdateTickets = useCallback(
    (name, delta) => {
      const updated = participantsRef.current.map((p) => {
        if ((p.name || p).toLowerCase() === name.toLowerCase()) {
          const currentT = p.tickets || 1;
          const nextT = Math.max(1, currentT + delta);
          return { ...p, tickets: nextT };
        }
        return p;
      });
      updateParticipants(updated);
    },
    [updateParticipants]
  );

  const handleRemoveParticipant = useCallback(
    (nameToRemove) => {
      const updated = participantsRef.current.filter(
        (p) => (p.name || p).toLowerCase() !== nameToRemove.toLowerCase()
      );
      updateParticipants(updated);
    },
    [updateParticipants]
  );

  const handleClearParticipants = useCallback(() => {
    updateParticipants([]);
  }, [updateParticipants]);

  const handleShuffleParticipants = useCallback(() => {
    const shuffled = [...participantsRef.current].sort(() => Math.random() - 0.5);
    updateParticipants(shuffled);
  }, [updateParticipants]);

  // Twitch Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Handle token success (from token paste or OAuth redirect)
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
    if (profile.login && !channelName) {
      setChannelName(profile.login);
    }
  }, [channelName]);

  // --- Parse OAuth Token or Error from URL Hash/Search on redirect ---
  useEffect(() => {
    // If redirected with error (e.g. error=redirect_mismatch), clean URL & open modal with help
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('error')) {
      window.history.replaceState(null, '', window.location.pathname);
      setIsAuthModalOpen(true);
    }

    const token = TwitchEventSubClient.parseTokenFromHash();
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      setIsAuthLoading(true);
      TwitchEventSubClient.authenticateWithToken(token)
        .then((profile) => {
          handleTokenSuccess(profile);
          setIsAuthLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch Twitch user:', err);
          setIsAuthLoading(false);
        });
    }
  }, [handleTokenSuccess]);

  // Twitch OAuth Login (redirect)
  const handleLoginTwitch = () => {
    const authUrl = TwitchEventSubClient.getAuthUrl(clientId);
    window.location.href = authUrl;
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

  // --- Toggle Master Integration (ВКЛЮЧИТЬ / ВЫКЛЮЧИТЬ ИНТЕГРАЦИЮ) ---
  const handleToggleIntegration = async () => {
    const targetChannel = (twitchUser?.login || channelName || '').trim().toLowerCase();
    if (!targetChannel) {
      alert('Укажите ник твич-канала для подключения к чату!');
      return;
    }

    const nextState = !isIntegrationActive;
    setIsIntegrationActive(nextState);

    if (nextState) {
      sound.playWin(); // audible confirmation

      // Connect Chat IRC if enabled
      if (enableChatKeyword && targetChannel) {
        ircClientRef.current = new TwitchIrcClient({
          onMessage: ({ displayName, message, tags = {}, username = '' }) => {
            const cleanMsg = (message || '').trim();

            // 1. Check !tts / !озвучка command for mods & vips
            if (/^!(tts|озвучка)\s+/i.test(cleanMsg)) {
              const textToSpeak = cleanMsg.replace(/^!(tts|озвучка)\s+/i, '').trim();
              const canTrigger = ttsService.canUserTrigger(tags, username, targetChannel);

              if (canTrigger && textToSpeak) {
                const isBroadcaster = username.toLowerCase() === targetChannel;
                const isMod = tags.mod === '1';
                const isVip = tags.vip === '1' || tags.badges?.includes('vip') || tags['badges-raw']?.includes('vip');
                const role = isBroadcaster ? 'Стример' : isMod ? 'Модератор' : isVip ? 'VIP' : 'Зритель';
                ttsService.speak(textToSpeak, displayName, role);
              }
            }

            // 2. Check if message is from active winner
            const currentWinner = winnerRef.current;
            if (currentWinner) {
              const wName = (currentWinner.name || currentWinner).toString().trim().toLowerCase();
              const sender = (displayName || '').toString().trim().toLowerCase();
              if (wName === sender) {
                const newMsgItem = {
                  id: Date.now() + Math.random(),
                  text: message,
                  timestamp: Date.now(),
                };
                setWinnerResponse((prev) => {
                  const prevMessages = prev?.messages || (prev?.message ? [{ id: 1, text: prev.message, timestamp: prev.timestamp }] : []);
                  const updatedMessages = [...prevMessages, newMsgItem];
                  const nextObj = {
                    answered: true,
                    messages: updatedMessages,
                    message: message, // keep for backward compatibility
                    timestamp: Date.now(),
                    firstMessageTimestamp: prev?.firstMessageTimestamp || Date.now(),
                  };
                  winnerResponseRef.current = nextObj;
                  return nextObj;
                });

                if (responseTimerIntervalRef.current) {
                  clearInterval(responseTimerIntervalRef.current);
                  responseTimerIntervalRef.current = null;
                }
                sound.playJoin();
              }
            }

            // 3. Live chat bet for PointAuc auction: !ставка [номер_лота] [сумма]
            const betMatch = cleanMsg.match(/^!(?:ставка|лот|bet)\s+(\d+)\s+(\d+)/i);
            if (betMatch) {
              const lotNum = parseInt(betMatch[1], 10);
              const amount = parseInt(betMatch[2], 10);
              if (lotNum > 0 && amount > 0) {
                syncService.send('CHAT_BET', {
                  user: displayName || username,
                  lotNumber: lotNum,
                  amount,
                });
              }
            }

            // 4. Keyword matching for participants
            const currentWordsStr = keywordRef.current || '';
            const lowerMsg = (message || '').trim().toLowerCase();
            const words = currentWordsStr
              .split(',')
              .map((w) => w.trim().toLowerCase())
              .filter(Boolean);

            if (words.length === 0) return;

            const matched = words.some((word) => {
              const plain = word.replace(/^!/, '');
              return (
                lowerMsg === word ||
                lowerMsg === plain ||
                lowerMsg === `!${plain}` ||
                lowerMsg.split(/\s+/).includes(word) ||
                lowerMsg.split(/\s+/).includes(plain) ||
                lowerMsg.split(/\s+/).includes(`!${plain}`)
              );
            });

            if (matched) {
              handleAddParticipant(displayName, 'chat_keyword');
            }
          },
          onStatusChange: (status) => setChatStatus(status),
        });
        ircClientRef.current.connect(targetChannel);
      }

      // Connect EventSub (Channel Points) if enabled
      if (enableChannelPoints && twitchToken) {
        if (!eventSubClientRef.current) {
          eventSubClientRef.current = new TwitchEventSubClient({
            onRedemption: (redemption) => {
              handleAddParticipant(redemption.userName, 'channel_points', {
                rewardTitle: redemption.rewardTitle,
                rewardCost: redemption.rewardCost,
              });
            },
          });
        }

        try {
          await eventSubClientRef.current.connect({
            clientId,
            token: twitchToken,
            rewardFilterId: selectedRewardId,
          });

          // Unpause reward on Twitch
          if (selectedRewardId && selectedRewardId !== 'ALL') {
            await eventSubClientRef.current.setRewardPaused(
              twitchUser.id,
              selectedRewardId,
              false,
              twitchToken,
              clientId
            );
          }
        } catch (e) {
          console.warn('EventSub connect warning:', e);
        }
      }
    } else {
      // Turned OFF: stop listening & pause reward on Twitch
      if (ircClientRef.current) {
        ircClientRef.current.disconnect();
        setChatStatus('disconnected');
      }

      if (eventSubClientRef.current && twitchUser && selectedRewardId && selectedRewardId !== 'ALL') {
        // Pause reward so viewers can't buy it while integration is stopped
        await eventSubClientRef.current.setRewardPaused(
          twitchUser.id,
          selectedRewardId,
          true,
          twitchToken,
          clientId
        );
      }
    }
  };

  // Simulate Channel Point redemption for testing
  const handleSimulateChannelPoint = () => {
    if (!isIntegrationActive) {
      alert('Сначала нажмите «ВКЛЮЧИТЬ ИНТЕГРАЦИЮ», чтобы проверить добавление зрителей!');
      return;
    }
    const mockNames = ['Zloy_Gamer', 'TwitchViewer_99', 'TopDonater', 'SanyaStream', 'LuckyGuy', 'ProCarry'];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)] + '_' + Math.floor(Math.random() * 100);
    handleAddParticipant(randomName, 'channel_points', {
      rewardTitle: 'Аукцион 1 балл',
      rewardCost: 1,
    });
  };

  // --- Spin Wheel Handlers ---
  const handleSpin = () => {
    if (isSpinning || participants.length === 0) return;
    setWinner(null);
    winnerRef.current = null;
    setWinnerResponse(null);
    winnerResponseRef.current = null;
    if (responseTimerIntervalRef.current) {
      clearInterval(responseTimerIntervalRef.current);
      responseTimerIntervalRef.current = null;
    }
    setIsSpinning(true);
    syncService.send('START_SPIN', { spinDuration });
  };

  const handleSpinEnd = (winningParticipant) => {
    setIsSpinning(false);
    setWinner(winningParticipant);
    winnerRef.current = winningParticipant;

    // Reset winner response state
    setWinnerResponse(null);
    winnerResponseRef.current = null;
    setResponseSecondsLeft(60);

    // Clear any previous countdown
    if (responseTimerIntervalRef.current) {
      clearInterval(responseTimerIntervalRef.current);
      responseTimerIntervalRef.current = null;
    }

    // Start 60s countdown timer
    responseTimerIntervalRef.current = setInterval(() => {
      setResponseSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(responseTimerIntervalRef.current);
          responseTimerIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (autoRemoveWinner) {
      setTimeout(() => {
        handleRemoveParticipant(winningParticipant.name || winningParticipant);
      }, 1500);
    }
  };

  const handleCloseWinnerModal = () => {
    if (responseTimerIntervalRef.current) {
      clearInterval(responseTimerIntervalRef.current);
      responseTimerIntervalRef.current = null;
    }
    setWinner(null);
    winnerRef.current = null;
    setWinnerResponse(null);
    winnerResponseRef.current = null;
  };

  const handleReroll = (winnerToReroll) => {
    if (responseTimerIntervalRef.current) {
      clearInterval(responseTimerIntervalRef.current);
      responseTimerIntervalRef.current = null;
    }
    const nameToRemove = winnerToReroll?.name || winnerToReroll;
    if (nameToRemove) {
      handleRemoveParticipant(nameToRemove);
    }
    setWinner(null);
    winnerRef.current = null;
    setWinnerResponse(null);
    winnerResponseRef.current = null;

    // Immediately spin again
    setTimeout(() => {
      handleSpin();
    }, 250);
  };

  // Test simulation for winner response (useful for quick UI check)
  const handleSimulateWinnerResponse = (mockText = 'я тут! го играть') => {
    if (winnerRef.current) {
      const newMsgItem = {
        id: Date.now() + Math.random(),
        text: mockText,
        timestamp: Date.now(),
      };
      setWinnerResponse((prev) => {
        const prevMessages = prev?.messages || (prev?.message ? [{ id: 1, text: prev.message, timestamp: prev.timestamp }] : []);
        const updatedMessages = [...prevMessages, newMsgItem];
        const nextObj = {
          answered: true,
          messages: updatedMessages,
          message: mockText,
          timestamp: Date.now(),
          firstMessageTimestamp: prev?.firstMessageTimestamp || Date.now(),
        };
        winnerResponseRef.current = nextObj;
        return nextObj;
      });

      if (responseTimerIntervalRef.current) {
        clearInterval(responseTimerIntervalRef.current);
        responseTimerIntervalRef.current = null;
      }
      sound.playJoin();
    }
  };

  const [copiedObs, setCopiedObs] = useState(false);
  const obsUrl = `${window.location.origin}${window.location.pathname}?obs=true`;
  const copyObsLink = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedObs(true);
    setTimeout(() => setCopiedObs(false), 2000);
  };

  const handleOpenWheelWithLots = (lotsToConvert) => {
    const converted = (lotsToConvert || []).map((l) => ({
      name: l.name,
      tickets: Math.max(1, Math.round((l.amount || 100) / 100)),
      source: 'auction_lot',
    }));
    updateParticipants(converted);
    setAppMode('wheel');
    setAllowMultipleTickets(true);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 lg:p-8 flex flex-col items-center">
      {/* Floating Active TTS Notification */}
      {activeTts && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-zinc-900/95 border border-purple-500/50 shadow-2xl rounded-2xl animate-in slide-in-from-top-4 text-xs">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center animate-pulse">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-purple-300 font-mono">
              [{activeTts.userRole}] {activeTts.sender}:
            </span>
            <span className="text-white text-sm max-w-sm break-words">«{activeTts.rawText || activeTts.text}»</span>
          </div>
        </div>
      )}

      {/* Global Top Header with Mode Switcher */}
      <header className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800/80">
        {/* Mode Switcher Tabs: 3 modes */}
        <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => handleSetAppMode('carry')}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
              appMode === 'carry'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4 text-emerald-400" />
            <span>🎲 Прокачки</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetAppMode('auction')}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
              appMode === 'auction'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4 text-blue-400" />
            <span>📊 Аукцион лотов</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetAppMode('wheel')}
            className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-bold transition-all ${
              appMode === 'wheel'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>🎡 Колесо рулетки</span>
          </button>
        </div>

        {/* Global actions: test !tts, twitch info, sound toggle, obs link */}
        <div className="flex items-center gap-2.5">
          {/* Quick test !tts button */}
          <button
            type="button"
            onClick={() => {
              ttsService.speak('Привет от стрима Маги! Озвучка для модераторов и виперов работает отлично.', 'Maga', 'Стример');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/40 border border-purple-800/60 rounded-lg hover:bg-purple-900/40 transition-all"
            title="Проверить естественную озвучку !tts (голос для модераторов и VIP)"
          >
            <Megaphone className="w-3.5 h-3.5 text-purple-400" />
            <span>Тест !tts</span>
          </button>

          {twitchUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
              {twitchUser.avatar && (
                <img
                  src={twitchUser.avatar}
                  alt={twitchUser.displayName}
                  className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                />
              )}
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white">{twitchUser.displayName}</span>
              <button
                type="button"
                onClick={handleLogoutTwitch}
                className="ml-1 text-zinc-500 hover:text-rose-400 text-xs"
                title="Выйти из Twitch"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-xl text-xs text-purple-200 hover:text-white font-semibold transition-all shadow-sm active:scale-95"
              title="Авторизоваться через Twitch"
            >
              <LogIn className="w-3.5 h-3.5 text-purple-300" />
              <span>Войти через Twitch</span>
            </button>
          )}

          {channelName && !twitchUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  chatStatus === 'connected' ? 'bg-emerald-400' : 'bg-zinc-500'
                }`}
              />
              <span className="text-zinc-400 font-mono">twitch.tv/{channelName}</span>
            </div>
          ) : null}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={copyObsLink}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all"
            title="Скопировать ссылку для OBS"
          >
            {copiedObs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedObs ? 'Скопировано' : 'OBS Виджет'}
          </button>
        </div>
      </header>

      {/* Mode View: 1. CarryRollView | 2. LotAuctionView | 3. Wheel + AuctionTopBoard */}
      {appMode === 'carry' && (
        <CarryRollView
          participants={participants}
          winner={winner}
          winnerResponse={winnerResponse}
          responseSecondsLeft={responseSecondsLeft}
          onRollWinner={handleSpinEnd}
          onReroll={handleReroll}
          onResetWinner={handleCloseWinnerModal}
          onRemoveParticipant={handleRemoveParticipant}
          onClearParticipants={handleClearParticipants}
          onShuffleParticipants={handleShuffleParticipants}
          onAddParticipant={handleAddParticipant}
          onSimulateWinnerResponse={handleSimulateWinnerResponse}
          channelName={channelName}
          setChannelName={setChannelName}
          chatStatus={chatStatus}
          isIntegrationActive={isIntegrationActive}
          onToggleIntegration={handleToggleIntegration}
          keyword={keyword}
          setKeyword={setKeyword}
          enableChatKeyword={enableChatKeyword}
          setEnableChatKeyword={setEnableChatKeyword}
          twitchUser={twitchUser}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          copiedObs={copiedObs}
          copyObsLink={copyObsLink}
        />
      )}

      {appMode === 'auction' && (
        <LotAuctionView
          channelName={channelName}
          chatStatus={chatStatus}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          copiedObs={copiedObs}
          copyObsLink={copyObsLink}
          onOpenWheelWithLots={handleOpenWheelWithLots}
        />
      )}

      {appMode === 'wheel' && (
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          {/* 1. Auction Players Board AT THE TOP (Большие ячейки сверху!) */}
          <AuctionTopBoard
            participants={participants}
            onUpdateTickets={handleUpdateTickets}
            onSetTickets={handleSetTickets}
            onRemoveParticipant={handleRemoveParticipant}
            onClearParticipants={handleClearParticipants}
            onShuffleParticipants={handleShuffleParticipants}
            onAddParticipant={handleAddParticipant}
          />

          {/* 2. Wheel & Auction Controls */}
          <main className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full">
            {/* The Wheel */}
            <div className="flex flex-col items-center justify-center flex-1 w-full">
              <div className="relative p-4 rounded-2xl bg-[#121215] border border-zinc-800 shadow-xl">
                <Wheel
                  participants={participants}
                  isSpinning={isSpinning}
                  spinDuration={spinDuration}
                  onSpinEnd={handleSpinEnd}
                  size={520}
                />
              </div>
            </div>

            {/* Auction Control Panel */}
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
                onClearParticipants={handleClearParticipants}
                onShuffleParticipants={handleShuffleParticipants}
                isSpinning={isSpinning}
                onSpin={handleSpin}
                autoRemoveWinner={autoRemoveWinner}
                setAutoRemoveWinner={setAutoRemoveWinner}
                soundEnabled={soundEnabled}
                setSoundEnabled={setSoundEnabled}
                voiceoverEnabled={voiceoverEnabled}
                setVoiceoverEnabled={setVoiceoverEnabled}
                appMode={appMode}
                setAppMode={handleSetAppMode}
                ticketsPerEntry={ticketsPerEntry}
                setTicketsPerEntry={setTicketsPerEntry}
                allowMultipleTickets={allowMultipleTickets}
                setAllowMultipleTickets={setAllowMultipleTickets}
                onUpdateTickets={handleUpdateTickets}
                onSetTickets={handleSetTickets}
                hideParticipantList={true}
              />
            </div>
          </main>

          {/* Winner Modal for Auction Wheel */}
          {winner && (
            <WinnerModal
              winner={winner}
              onClose={handleCloseWinnerModal}
              onRemoveWinner={(w) => handleRemoveParticipant(w.name || w)}
              onSpinAgain={handleSpin}
              onReroll={handleReroll}
              winnerResponse={winnerResponse}
              responseSecondsLeft={responseSecondsLeft}
              onSimulateWinnerResponse={handleSimulateWinnerResponse}
            />
          )}
        </div>
      )}

      {/* Twitch Authentication Modal */}
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
