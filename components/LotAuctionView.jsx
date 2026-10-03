import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Trophy,
  History,
  Activity,
  Settings,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { sound } from '../services/sound';
import { syncService } from '../services/syncChannel';
import confetti from 'canvas-confetti';

const LOT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export const LotAuctionView = ({
  // Twitch IRC & chat state
  channelName,
  chatStatus,
  onIncomingChatMessage,
  soundEnabled,
  setSoundEnabled,
  copiedObs,
  copyObsLink,
  onOpenWheelWithLots,
}) => {
  // Lots state
  const [lots, setLots] = useState(() => {
    try {
      const saved = localStorage.getItem('__stream_auction_lots');
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = (parsed || []).filter(
          (l) => !['Dota 2 с подписчиками', 'CS2 калибровка', 'Фильм на стриме: Матрица'].includes(l.name)
        );
        return filtered;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Save persistent lots
  useEffect(() => {
    try {
      localStorage.setItem('__stream_auction_lots', JSON.stringify(lots));
    } catch {}
  }, [lots]);

  // Top Bar Inputs
  const [newLotName, setNewLotName] = useState('');
  const [newLotAmount, setNewLotAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Timer State (Default 10 minutes: 10:00:00)
  const [initialTime, setInitialTime] = useState(600); // 10 mins
  const [timeLeft, setTimeLeft] = useState(600);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

  // Anti-snipe protection (adds +30s if bet arrives in last 30s)
  const [antiSnipe, setAntiSnipe] = useState(true);

  // Bets Feed (starts clean)
  const [betsFeed, setBetsFeed] = useState([]);

  const [activeRightTab, setActiveRightTab] = useState('bets'); // 'bets' | 'history'

  // Quick add modal / popover
  const [selectedLotForAdd, setSelectedLotForAdd] = useState(null);
  const [customAddAmount, setCustomAddAmount] = useState('500');

  // Winner modal when timer ends
  const [auctionWinner, setAuctionWinner] = useState(null);

  // Total bank
  const totalBank = lots.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  // Timer countdown
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            sound.playWin();

            // Find leading lot
            if (lots.length > 0) {
              const sorted = [...lots].sort((a, b) => (b.amount || 0) - (a.amount || 0));
              setAuctionWinner(sorted[0]);
              try {
                confetti({
                  particleCount: 80,
                  spread: 80,
                  origin: { y: 0.5 },
                });
              } catch {}
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, lots]);

  // Subscribe to live Twitch chat bets (!ставка 1 500)
  useEffect(() => {
    const unsub = syncService.subscribe((msg) => {
      if (msg?.type === 'CHAT_BET') {
        const { user, lotNumber, amount } = msg.payload || {};
        if (lotNumber > 0 && amount > 0) {
          const targetLot = lots[lotNumber - 1];
          if (targetLot) {
            handleAddAmountToLot(targetLot.id, amount, user || 'Зритель');
          }
        }
      }
    });
    return unsub;
  }, [lots]);

  // Format timer as HH:MM:SS or MM:SS
  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n) => (n < 10 ? `0${n}` : n);

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Add new lot
  const handleAddNewLot = (e) => {
    e?.preventDefault();
    if (!newLotName.trim()) return;

    const parsedAmount = Math.max(0, parseInt(newLotAmount, 10) || 0);
    const nextNumber = lots.length + 1;
    const color = LOT_COLORS[(nextNumber - 1) % LOT_COLORS.length];

    const newLot = {
      id: Date.now(),
      name: newLotName.trim(),
      amount: parsedAmount,
      color,
    };

    setLots((prev) => [...prev, newLot]);
    setNewLotName('');
    setNewLotAmount('');
    sound.playJoin();
  };

  // Add amount to lot
  const handleAddAmountToLot = (lotId, delta, user = 'Стример') => {
    setLots((prev) =>
      prev.map((lot) => {
        if (lot.id === lotId) {
          const nextAmt = Math.max(0, (lot.amount || 0) + delta);
          return { ...lot, amount: nextAmt };
        }
        return lot;
      })
    );

    const targetLot = lots.find((l) => l.id === lotId);
    if (targetLot) {
      setBetsFeed((prev) => [
        {
          id: Date.now() + Math.random(),
          user,
          lotName: targetLot.name,
          lotNumber: lots.findIndex((l) => l.id === lotId) + 1,
          amount: delta,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 30),
      ]);
    }

    // Anti-snipe: if timer < 30s, add +30s
    if (antiSnipe && isTimerRunning && timeLeft < 30) {
      setTimeLeft((prev) => prev + 30);
    }

    sound.playJoin();
  };

  // Remove lot
  const handleRemoveLot = (lotId) => {
    setLots((prev) => prev.filter((l) => l.id !== lotId));
  };

  // Clear all lots
  const handleClearLots = () => {
    if (window.confirm('Очистить все лоты аукциона?')) {
      setLots([]);
    }
  };

  // Timer actions
  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(initialTime);
  };

  const handleAddTimerTime = (deltaSeconds) => {
    setTimeLeft((prev) => Math.max(0, prev + deltaSeconds));
  };

  // Filter lots by search query
  const filteredLots = lots.filter((l) =>
    (l.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort lots by amount descending (highest bid first, like in PointAuc)
  const sortedLots = [...filteredLots].sort((a, b) => (b.amount || 0) - (a.amount || 0));

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 text-zinc-100 font-sans">
      {/* 1. Top Action Bar (Exactly like photo: [Название нового лота] [₽] [+ Добавить лот] | [🔍 Поиск]) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#121215] border border-zinc-800 rounded-xl shadow-lg">
        {/* Left: Add New Lot Inputs */}
        <form onSubmit={handleAddNewLot} className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          <input
            type="text"
            placeholder="Название нового лота"
            value={newLotName}
            onChange={(e) => setNewLotName(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-2 text-xs sm:text-sm text-white bg-zinc-900 border border-zinc-700/80 rounded-lg focus:outline-none focus:border-blue-500 placeholder-zinc-500"
          />

          <div className="relative w-28 sm:w-32">
            <input
              type="number"
              min="0"
              placeholder="Баллы"
              value={newLotAmount}
              onChange={(e) => setNewLotAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono text-white bg-zinc-900 border border-zinc-700/80 rounded-lg focus:outline-none focus:border-blue-500 placeholder-zinc-500"
            />
            <span className="absolute right-3 top-2.5 text-xs text-zinc-500 pointer-events-none font-bold">
              б.
            </span>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#3b82f6] hover:bg-blue-600 rounded-lg shadow transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить лот</span>
          </button>
        </form>

        {/* Divider */}
        <div className="hidden md:block w-px h-7 bg-zinc-800" />

        {/* Right: Search Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск среди лотов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm text-white bg-zinc-900 border border-zinc-700/80 rounded-lg focus:outline-none focus:border-zinc-500 placeholder-zinc-500"
          />
        </div>
      </div>

      {/* 2. Main Layout: Left Lots Table (75%), Right Timer & Bets (25%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Lots List Table (8-9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-3">
          {/* Table Header / Sub-bar */}
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 bg-zinc-900/60 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center">#</span>
              <span>Название лота</span>
            </div>
            <div className="flex items-center gap-8 pr-2">
              <span className="font-mono">Банк: {totalBank.toLocaleString('ru-RU')} баллов</span>
              <span>Баллы</span>
              <span>Действия</span>
            </div>
          </div>

          {/* Lots Rows */}
          {sortedLots.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 bg-[#121215] border border-dashed border-zinc-800 rounded-xl">
              Лотов пока нет. Введите название в верхнее поле и нажмите «+ Добавить лот».
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedLots.map((lot, index) => {
                const percent = totalBank > 0 ? Math.round((lot.amount / totalBank) * 100) : 0;
                const isLeader = index === 0 && sortedLots.length > 1;

                return (
                  <div
                    key={lot.id}
                    className={`relative overflow-hidden flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#121215] border rounded-xl transition-all ${
                      isLeader
                        ? 'border-blue-500/50 shadow-md shadow-blue-500/5'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Background Progress Fill showing share of total bank */}
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-600/10 pointer-events-none transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />

                    {/* Left: Number, Tag, Title */}
                    <div className="relative flex items-center gap-3 min-w-[200px] flex-1 z-10">
                      <span className="w-6 text-center text-xs font-mono font-bold text-zinc-400">
                        {index + 1}
                      </span>

                      {/* Color Tag Badge: #1, #2 */}
                      <span
                        className="px-2 py-0.5 text-xs font-mono font-bold rounded text-white"
                        style={{ backgroundColor: lot.color || '#3b82f6' }}
                      >
                        #{index + 1}
                      </span>

                      <span className="text-sm font-semibold text-white break-words" title={lot.name}>
                        {lot.name}
                      </span>
                    </div>

                    {/* Middle: Amount & Percent */}
                    <div className="relative flex items-center gap-4 z-10">
                      <div className="flex flex-col items-end">
                        <span className="text-sm sm:text-base font-extrabold font-mono text-white">
                          {(lot.amount || 0).toLocaleString('ru-RU')} б.
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">{percent}% от банка</span>
                      </div>

                      {/* Quick Add Presets (+100, +500) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddAmountToLot(lot.id, 100)}
                          className="px-2 py-1 text-xs font-mono font-bold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors"
                          title="+100 баллов"
                        >
                          +100
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddAmountToLot(lot.id, 500)}
                          className="px-2 py-1 text-xs font-mono font-bold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors"
                          title="+500 баллов"
                        >
                          +500
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLotForAdd(lot);
                            setCustomAddAmount('1000');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow transition-colors"
                          title="Добавить баллы"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Баллы</span>
                        </button>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLot(lot.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition-colors"
                        title="Удалить лот"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Bar: Clear & Wheel Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-zinc-500">
            <div className="flex items-center gap-3">
              <span>Лотов: {lots.length}</span>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearLots}
                disabled={lots.length === 0}
                className="hover:text-rose-400 underline disabled:opacity-40"
              >
                Очистить все лоты
              </button>
            </div>

            {onOpenWheelWithLots && (
              <button
                type="button"
                onClick={() => onOpenWheelWithLots(lots)}
                disabled={lots.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Крутить колесо по лотам</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Huge Timer, Controls & Bets Feed (3-4 cols, PointAuc style) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
          {/* 1. Timer Box */}
          <div className="p-5 bg-[#121215] border border-zinc-800 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            {/* Huge Digital Timer Digits (like in photo: 10:00:00) */}
            <div
              className={`text-4xl sm:text-5xl font-black font-mono tracking-tight my-2 select-none ${
                timeLeft <= 30 && timeLeft > 0
                  ? 'text-rose-400 animate-pulse'
                  : 'text-white'
              }`}
            >
              {formatTimer(timeLeft)}
            </div>

            {/* Timer Control Buttons (▶, ↺, ▲, ▼) */}
            <div className="flex items-center gap-2 mt-3">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={handleToggleTimer}
                className={`p-2.5 rounded-xl font-bold transition-all shadow ${
                  isTimerRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-white hover:bg-zinc-200 text-black'
                }`}
                title={isTimerRunning ? 'Пауза' : 'Старт'}
              >
                {isTimerRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={handleResetTimer}
                className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                title="Сброс на 10 минут"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Add 1 minute */}
              <button
                type="button"
                onClick={() => handleAddTimerTime(60)}
                className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                title="+1 минута"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              {/* Subtract 1 minute */}
              <button
                type="button"
                onClick={() => handleAddTimerTime(-60)}
                className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                title="-1 минута"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Anti-snipe toggle */}
            <div className="flex items-center justify-between w-full pt-3 mt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={antiSnipe}
                  onChange={(e) => setAntiSnipe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 text-blue-500 focus:ring-0"
                />
                <span>Анти-снайпер (+30с)</span>
              </label>
              <span className="font-mono text-zinc-500">
                {isTimerRunning ? 'Идет' : 'Пауза'}
              </span>
            </div>
          </div>

          {/* 2. Twitch Chat Integration Note (PointAuc style) */}
          <div className="p-3.5 bg-[#121215] border border-zinc-800 rounded-xl flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300">Прием ставок из чата:</span>
              <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    chatStatus === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
                {chatStatus === 'connected' ? 'Чат подключен' : 'Оффлайн'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
              Команда в чате: <strong className="text-white">!ставка [номер] [баллы]</strong>
              <br />
              <span className="text-zinc-500">Пример: !ставка 1 500 (накинет 500 баллов на лот #1)</span>
            </p>
          </div>

          {/* 3. Right Sidebar Tabs: [ Ставки ] | [ История ] */}
          <div className="p-4 bg-[#121215] border border-zinc-800 rounded-2xl flex flex-col gap-3 shadow-lg">
            {/* Tab switcher */}
            <div className="grid grid-cols-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg gap-1">
              <button
                type="button"
                onClick={() => setActiveRightTab('bets')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeRightTab === 'bets'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Баллы</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('history')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeRightTab === 'history'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>История</span>
              </button>
            </div>

            {/* Bets Feed List */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {betsFeed.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Баллы еще не начислялись
                </div>
              ) : (
                betsFeed.map((b) => (
                  <div
                    key={b.id}
                    className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{b.user}</span>
                      <span className="font-extrabold text-blue-400 font-mono">
                        +{b.amount.toLocaleString('ru-RU')} б.
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                      <span className="truncate max-w-[150px]">
                        к лоту #{b.lotNumber} ({b.lotName})
                      </span>
                      <span>
                        {new Date(b.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Custom Amount Add (+ баллы) */}
      {selectedLotForAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm p-6 bg-[#16161a] border border-zinc-800 rounded-2xl shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">
              Добавить баллы к лоту: {selectedLotForAdd.name}
            </h3>
            <p className="text-xs text-zinc-400 mb-4 font-mono">
              Текущие баллы: {(selectedLotForAdd.amount || 0).toLocaleString('ru-RU')} баллов
            </p>

            <div className="mb-4">
              <label className="block text-xs text-zinc-300 mb-1.5 font-medium">Количество баллов</label>
              <input
                type="number"
                min="1"
                value={customAddAmount}
                onChange={(e) => setCustomAddAmount(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-2 text-base font-mono font-bold text-white bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500"
              />

              <div className="flex items-center gap-1.5 mt-2">
                {[100, 300, 500, 1000, 2000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCustomAddAmount(String(v))}
                    className="flex-1 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                  >
                    +{v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLotForAdd(null)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(customAddAmount, 10);
                  if (val > 0) {
                    handleAddAmountToLot(selectedLotForAdd.id, val, 'Стример');
                  }
                  setSelectedLotForAdd(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow transition-colors"
              >
                Добавить баллы
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner Modal when Auction Timer reaches 00:00:00 */}
      {auctionWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 bg-[#16161a] border border-zinc-800 rounded-2xl shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1 block">
              Победитель аукциона!
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              {auctionWinner.name}
            </h2>
            <div className="text-lg font-mono font-bold text-blue-400 mb-4">
              Итог: {(auctionWinner.amount || 0).toLocaleString('ru-RU')} баллов
            </div>

            <p className="text-xs text-zinc-400 mb-6">
              Время аукциона вышло. Этот лот набрал наибольшее количество баллов!
            </p>

            <button
              type="button"
              onClick={() => setAuctionWinner(null)}
              className="w-full py-3 text-xs font-bold uppercase bg-white hover:bg-zinc-200 text-black rounded-xl transition-all"
            >
              Принять результат и закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
