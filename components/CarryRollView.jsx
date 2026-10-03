import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Trash2,
  Shuffle,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Power,
  Users,
  Trophy,
  Plus,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../services/sound';

export const CarryRollView = ({
  participants = [],
  winner,
  winnerResponse, // { answered: boolean, message: string, timestamp: number }
  responseSecondsLeft = 60,
  onRollWinner,
  onReroll,
  onResetWinner,
  onRemoveParticipant,
  onClearParticipants,
  onShuffleParticipants,
  onAddParticipant,
  onSimulateWinnerResponse,

  // Twitch integration
  channelName,
  setChannelName,
  chatStatus,
  isIntegrationActive,
  onToggleIntegration,
  keyword,
  setKeyword,
  enableChatKeyword,
  setEnableChatKeyword,
  twitchUser,
  soundEnabled,
  setSoundEnabled,
  copiedObs,
  copyObsLink,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayCandidate, setDisplayCandidate] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Trigger roll animation
  const handleStartRoll = () => {
    if (participants.length === 0 || isRolling) return;

    onResetWinner();
    setIsRolling(true);

    const rollDuration = 2400; // 2.4s rapid cycling
    const startTime = Date.now();
    let intervalTime = 60;

    const cycle = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / rollDuration);

      // Pick random candidate for visual flick
      const randomIndex = Math.floor(Math.random() * participants.length);
      const candidate = participants[randomIndex];
      setDisplayCandidate(candidate.name || candidate);
      sound.playTick();

      if (progress < 1) {
        // Slow down slightly near the end
        intervalTime = 60 + Math.pow(progress, 3) * 160;
        setTimeout(cycle, intervalTime);
      } else {
        // Final winner pick (uniform random among participants)
        const finalWinner = participants[Math.floor(Math.random() * participants.length)];
        setDisplayCandidate(finalWinner.name || finalWinner);
        setIsRolling(false);

        // Sound + confetti
        sound.playWin();
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#ffffff', '#a1a1aa', '#71717a'],
          });
        } catch {}

        onRollWinner(finalWinner);
      }
    };

    cycle();
  };

  const handleManualAddSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onAddParticipant(manualInput.trim(), 'manual');
    setManualInput('');
  };

  const handleBulkAddSubmit = () => {
    const names = bulkInput
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    names.forEach((name) => onAddParticipant(name, 'manual'));
    setBulkInput('');
    setShowBulkModal(false);
  };

  const winnerName = winner?.name || winner;
  const isAnswered = winnerResponse?.answered;
  const isTimeOut = !isAnswered && responseSecondsLeft <= 0;

  const messagesList =
    winnerResponse?.messages && winnerResponse.messages.length > 0
      ? winnerResponse.messages
      : winnerResponse?.message
      ? [{ id: 1, text: winnerResponse.message, timestamp: winnerResponse.timestamp }]
      : [];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Top Header Bar for Carry Mode */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#121215] border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
            <Shuffle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Прокачки: Быстрый рандомный ролл
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                Без колеса
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Случайный выбор участника. Все сообщения победителя из чата отображаются и сохраняются на экране!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      {/* Main Grid: Left Hero Roller / Winner View, Right Settings & Pool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hero Roll & Winner Display (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* Main Card */}
          <div className="relative p-6 sm:p-8 bg-[#121215] border border-zinc-800 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[380px] text-center">
            {/* Top Status Badge */}
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/90 border border-zinc-800 rounded-full text-xs text-zinc-300">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                Участников в пуле: <strong className="text-white font-mono">{participants.length}</strong>
              </span>
            </div>

            {/* Visual Roller Display */}
            {isRolling ? (
              <div className="my-8 flex flex-col items-center justify-center animate-pulse">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Идет выбор победителя...
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight break-all font-mono py-2 px-4 rounded-xl bg-zinc-900/80 border border-zinc-700">
                  {displayCandidate || '...'}
                </div>
              </div>
            ) : winner ? (
              /* Winner Showcase Card */
              <div className="w-full flex flex-col items-center my-2">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3 shadow-md">
                  <Trophy className="w-7 h-7 text-white" />
                </div>

                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Выпал победитель:
                </span>
                <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight break-all mb-4">
                  {winnerName}
                </h3>

                {/* Real-time Twitch Chat Message Display (ALL MESSAGES VISIBLE AND PRESERVED) */}
                <div className="w-full max-w-lg mb-4">
                  {isAnswered ? (
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-left shadow-lg animate-in zoom-in-95 duration-200 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Сообщения победителя в чате Twitch ({messagesList.length}):
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {messagesList.length > 0 &&
                            new Date(messagesList[messagesList.length - 1].timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                        </span>
                      </div>

                      {/* Scrollable feed of all winner messages */}
                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                        {messagesList.map((msg, mIdx) => (
                          <div
                            key={msg.id || mIdx}
                            className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-black/60 border border-emerald-500/30 text-white font-mono break-words shadow-sm"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-emerald-400 font-bold text-xs select-none">#{mIdx + 1}</span>
                              <span className="text-sm font-semibold break-words">« {msg.text || msg.message} »</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 shrink-0 font-mono select-none pt-0.5">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 text-[11px] text-emerald-300/80 flex items-center justify-between border-t border-emerald-500/20">
                        <span>✅ Сообщения сохраняются на экране в реальном времени</span>
                        {onSimulateWinnerResponse && (
                          <button
                            type="button"
                            onClick={() => onSimulateWinnerResponse(`мой ник: ${winnerName}_carry`)}
                            className="text-[10px] text-emerald-400 hover:text-white underline cursor-pointer"
                            title="Сымитировать еще одно сообщение победителя"
                          >
                            + тест еще сообщения
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isTimeOut ? (
                    <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl text-left shadow-lg animate-in fade-in">
                      <div className="text-xs text-rose-400 font-bold mb-1 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Время вышло! Участник не написал в чат (AFK).
                      </div>
                      <p className="text-xs text-zinc-400">
                        {winnerName} не отозвался за 60 секунд. Нажмите «Реролл», чтобы выбрать другого участника.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left flex flex-col gap-2 shadow-inner">
                      <div className="flex items-center justify-between text-xs text-zinc-300">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-zinc-400 animate-spin" />
                          Ожидание 1-го сообщения в чате Twitch...
                        </span>
                        <span
                          className={`font-mono font-bold text-base ${
                            responseSecondsLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-white'
                          }`}
                        >
                          00:{responseSecondsLeft < 10 ? `0${responseSecondsLeft}` : responseSecondsLeft}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Как только <strong className="text-white">{winnerName}</strong> отправит хоть слово в чат стрима — оно <strong>автоматически откроется здесь</strong> на экране без нажатия каких-либо кнопок.
                      </p>
                      {onSimulateWinnerResponse && (
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => onSimulateWinnerResponse('я тут, го катку!')}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
                          >
                            [тест: сымитировать ответ в чате]
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Winner Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-lg">
                  <button
                    onClick={() => onReroll(winner)}
                    className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase rounded-xl transition-all ${
                      isTimeOut
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isTimeOut ? 'Реролл (выбрать другого)' : 'Реролл / Выбрать другого'}
                  </button>

                  <button
                    onClick={onResetWinner}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase bg-white hover:bg-zinc-200 text-black rounded-xl transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Принять и завершить
                  </button>
                </div>
              </div>
            ) : (
              /* Idle State: Ready to roll */
              <div className="flex flex-col items-center my-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Готовы к выбору?
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mb-6">
                  Нажмите кнопку ниже. Система случайно выберет одного из зрителей и будет ждать его ответ в чате стрима.
                </p>

                <button
                  onClick={handleStartRoll}
                  disabled={participants.length === 0}
                  className={`flex items-center justify-center gap-3 px-8 py-4 text-base font-extrabold tracking-wider uppercase rounded-2xl shadow-xl transition-all ${
                    participants.length === 0
                      ? 'bg-zinc-800/60 text-zinc-600 cursor-not-allowed border border-zinc-800'
                      : 'bg-white text-black hover:bg-zinc-200 active:scale-95'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  Выбрать победителя (Ролл)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Integration & Participants List (4-5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          {/* 1. Twitch Channel & Connection */}
          <div className="p-4 bg-[#121215] border border-zinc-800 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Подключение к чату</span>
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    chatStatus === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
                {chatStatus === 'connected' ? 'Чат активен' : 'Оффлайн'}
              </span>
            </div>

            {!twitchUser && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-mono">twitch.tv/</span>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value.toLowerCase().trim())}
                  placeholder="ник канала стрима"
                  className="flex-1 px-3 py-1.5 text-xs text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-400 font-mono"
                />
              </div>
            )}

            <button
              onClick={onToggleIntegration}
              disabled={!twitchUser && !channelName.trim()}
              className={`flex items-center justify-center gap-2 w-full py-3 text-xs font-bold uppercase rounded-xl transition-all ${
                !twitchUser && !channelName.trim()
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : isIntegrationActive
                  ? 'bg-zinc-900 border border-zinc-700 text-rose-400 hover:bg-zinc-800'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${isIntegrationActive ? 'text-rose-400' : 'text-black'}`} />
              {isIntegrationActive ? 'Остановить прием' : 'Включить прием из чата'}
            </button>
          </div>

          {/* 2. Keyword Config */}
          <div className="p-4 bg-[#121215] border border-zinc-800 rounded-2xl flex flex-col gap-2.5">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-200">Кодовое слово для ролла</span>
              </div>
              <input
                type="checkbox"
                checked={enableChatKeyword}
                onChange={(e) => setEnableChatKeyword(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-0"
              />
            </label>

            {enableChatKeyword && (
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">Слово:</span>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="го, +, прокачка"
                  className="flex-1 px-2.5 py-1 text-xs font-mono text-white bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-zinc-400"
                />
                <span className="text-[10px] text-zinc-500">через запятую</span>
              </div>
            )}
            <p className="text-[11px] text-zinc-500">
              Каждый зритель добавляется 1 раз. Повторные сообщения от одного зрителя не дают лишних шансов.
            </p>
          </div>

          {/* 3. Participants List & Manual Add */}
          <div className="p-4 bg-[#121215] border border-zinc-800 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span>Список участников ({participants.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="text-xs text-zinc-400 hover:text-white underline"
                >
                  + список
                </button>
                <button
                  onClick={onShuffleParticipants}
                  disabled={participants.length <= 1}
                  className="text-zinc-500 hover:text-white disabled:opacity-40"
                  title="Перемешать"
                >
                  <Shuffle className="w-3 h-3" />
                </button>
                <button
                  onClick={onClearParticipants}
                  disabled={participants.length === 0}
                  className="text-zinc-500 hover:text-rose-400 disabled:opacity-40"
                  title="Очистить"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick manual add */}
            <form onSubmit={handleManualAddSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Вписать ник..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Вписать
              </button>
            </form>

            {/* List Chips */}
            {participants.length === 0 ? (
              <div className="py-6 text-xs text-center text-zinc-500 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-lg">
                Список пуст. Включите прием или напишите кодовое слово в чат.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-2 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
                {participants.map((p, idx) => {
                  const name = p.name || p;
                  return (
                    <span
                      key={`${name}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-200 bg-zinc-800/80 border border-zinc-700/60 rounded-lg"
                    >
                      <span className="text-zinc-500 text-[10px]">#{idx + 1}</span>
                      <span className="font-medium text-white max-w-[120px] truncate" title={name}>
                        {name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveParticipant(name)}
                        className="p-0.5 ml-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-[#16161a] border border-zinc-800 rounded-xl shadow-2xl">
            <h3 className="mb-1 text-sm font-semibold text-white">Вставить список участников</h3>
            <p className="mb-3 text-xs text-zinc-400">
              Вставьте ники участников (каждый с новой строки или через запятую).
            </p>
            <textarea
              rows={6}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="user1&#10;user2&#10;user3"
              className="w-full p-3 mb-4 text-xs font-mono text-white bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkAddSubmit}
                className="px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Добавить всех
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
