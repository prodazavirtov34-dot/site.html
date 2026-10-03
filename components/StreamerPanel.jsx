import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Trash2,
  Shuffle,
  Volume2,
  VolumeX,
  ExternalLink,
  Power,
  MessageSquare,
  Gift,
  Users,
  Check,
  Copy,
  Plus,
  LogIn,
  Settings,
} from 'lucide-react';

export const StreamerPanel = ({
  // Twitch Channel & Auth
  channelName,
  setChannelName,
  chatStatus,
  twitchUser,
  isAuthLoading,
  onLoginTwitch,
  onLogoutTwitch,
  clientId,
  setClientId,

  // Master Integration Switch
  isIntegrationActive,
  onToggleIntegration,

  // Sections & Modes: 'carry' vs 'auction'
  appMode = 'carry',
  setAppMode,
  ticketsPerEntry = 1,
  setTicketsPerEntry,
  hideParticipantList = false,

  // Modes config
  keyword,
  setKeyword,
  enableChatKeyword,
  setEnableChatKeyword,
  enableChannelPoints,
  setEnableChannelPoints,
  rewardsList,
  selectedRewardId,
  setSelectedRewardId,

  // Participants
  participants,
  onAddParticipant,
  onRemoveParticipant,
  onClearParticipants,
  onShuffleParticipants,

  // Wheel state
  isSpinning,
  onSpin,
  autoRemoveWinner,
  setAutoRemoveWinner,

  // Audio & Settings
  soundEnabled,
  setSoundEnabled,
  voiceoverEnabled,
  setVoiceoverEnabled,
  allowMultipleTickets,
  setAllowMultipleTickets,
  onUpdateTickets,
  onSetTickets,
}) => {
  const [manualName, setManualName] = useState('');
  const [copiedObs, setCopiedObs] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const obsUrl = `${window.location.origin}${window.location.pathname}?obs=true`;

  const copyObsLink = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedObs(true);
    setTimeout(() => setCopiedObs(false), 2000);
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    onAddParticipant(manualName.trim(), 'manual');
    setManualName('');
  };

  const handleBulkAdd = () => {
    const names = bulkInput
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    names.forEach((name) => onAddParticipant(name, 'manual'));
    setBulkInput('');
    setShowBulkModal(false);
  };

  return (
    <div className="flex flex-col w-full max-w-xl gap-4 p-6 bg-[#121215] border border-[#27272a] rounded-2xl shadow-xl">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#27272a]">
        {twitchUser ? (
          <div className="flex items-center gap-3">
            <img
              src={
                twitchUser.avatar ||
                'https://static-cdn.jtvnw.net/user-default-pictures-uv/75305d54-c7cc-40d1-bb60-108c0008022a-profile_image-70x70.png'
              }
              alt={twitchUser.displayName}
              className="w-9 h-9 rounded-full border border-[#3f3f46] object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{twitchUser.displayName}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span>twitch.tv/{twitchUser.login}</span>
                <button
                  onClick={onLogoutTwitch}
                  className="text-zinc-500 hover:text-zinc-300 underline text-xs"
                >
                  выйти
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLoginTwitch}
            className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:bg-zinc-800/60 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
              <LogIn className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Twitch аккаунт</div>
              <div className="text-xs font-semibold text-purple-300 hover:text-white">Войти в аккаунт →</div>
            </div>
          </button>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={copyObsLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all"
            title="Скопировать ссылку оверлея для OBS"
          >
            {copiedObs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedObs ? 'Скопировано' : 'OBS Виджет'}
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 bg-zinc-900/60 transition-colors"
            title="Настройки Twitch Client ID"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Mode Switcher (Прокачки vs Аукцион) */}
      <div className="grid grid-cols-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setAppMode('carry')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            appMode === 'carry'
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Shuffle className="w-3.5 h-3.5" />
            Прокачки (Ролл)
          </span>
          <span className="text-[10px] text-zinc-500 font-normal">1 чел = 1 шанс • Равный ролл</span>
        </button>

        <button
          type="button"
          onClick={() => setAppMode('auction')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            appMode === 'auction'
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5" />
            Аукцион (Шансы)
          </span>
          <span className="text-[10px] text-zinc-500 font-normal">Сообщения/баллы = больше %</span>
        </button>
      </div>

      {/* 3. Channel input or Login */}
      {!twitchUser && (
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Канал Twitch (для теста чата без логина)</span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  chatStatus === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
              {chatStatus === 'connected' ? 'Чат подключен' : 'Чат оффлайн'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">twitch.tv/</span>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value.toLowerCase().trim())}
              placeholder="введите ник канала (например: bratishkinoff)"
              className="flex-1 px-3 py-1.5 text-xs text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-400 font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[11px] text-zinc-500">
            <span>Для наград за баллы с Twitch:</span>
            <button
              onClick={onLoginTwitch}
              disabled={isAuthLoading}
              className="text-zinc-400 hover:text-white underline text-xs"
            >
              Войти через Twitch →
            </button>
          </div>
        </div>
      )}

      {/* 4. Master Button: ВКЛЮЧИТЬ / ВЫКЛЮЧИТЬ ИНТЕГРАЦИЮ */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onToggleIntegration}
          disabled={!twitchUser && !channelName.trim()}
          className={`flex items-center justify-center gap-2.5 w-full py-3.5 text-sm font-bold tracking-wide uppercase rounded-xl transition-all ${
            !twitchUser && !channelName.trim()
              ? 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed border border-zinc-800'
              : isIntegrationActive
              ? 'bg-zinc-900 border border-zinc-600 text-rose-400 hover:bg-zinc-800'
              : 'bg-white text-black hover:bg-zinc-200'
          }`}
        >
          <Power className={`w-4 h-4 ${isIntegrationActive ? 'text-rose-400' : 'text-black'}`} />
          {isIntegrationActive ? 'Выключить прием' : 'Включить прием'}
        </button>

        <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isIntegrationActive ? 'bg-emerald-400' : 'bg-zinc-600'}`}
            />
            <span>
              {isIntegrationActive ? 'Прием активен (чат и зрители залетают)' : 'Прием остановлен'}
            </span>
          </div>
          {(twitchUser || channelName) && (
            <span className="text-zinc-500 text-[11px]">
              Канал: {twitchUser?.login || channelName}
            </span>
          )}
        </div>
      </div>

      {/* 5. Настройки сбора для активного раздела */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {appMode === 'carry' ? 'Настройки прокачек' : 'Настройки аукциона'}
          </div>
          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
            {appMode === 'carry' ? '1 зритель = 1 шанс' : 'Баллы суммируются'}
          </span>
        </div>

        {/* Chat Keyword */}
        <div className="flex flex-col gap-2 p-3 bg-[#0d0d0f] border border-zinc-800/90 rounded-lg">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-200">
                {appMode === 'carry' ? 'Кодовое слово в чате (ролл прокачки)' : 'Кодовое слово в чате (билеты/баллы)'}
              </span>
            </div>
            <input
              type="checkbox"
              checked={enableChatKeyword}
              onChange={(e) => setEnableChatKeyword(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-0"
            />
          </label>

          {enableChatKeyword && (
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
              <span className="text-xs text-zinc-400">Слово:</span>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="го, +, прокачка"
                className="flex-1 px-2.5 py-1 text-xs font-mono text-white bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-zinc-400"
              />
              <span className="text-[11px] text-zinc-500">через запятую</span>
            </div>
          )}
        </div>

        {/* Auction-specific: Tickets per chat message */}
        {appMode === 'auction' && (
          <div className="flex flex-col gap-2 p-3 bg-[#0d0d0f] border border-zinc-800/90 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">
                Баллов за 1 сообщение со словом:
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                {ticketsPerEntry} {ticketsPerEntry === 1 ? 'балл' : 'баллов'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="1000"
                value={ticketsPerEntry}
                onChange={(e) =>
                  setTicketsPerEntry(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-20 px-2.5 py-1 text-xs font-mono font-bold text-center text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-400"
              />
              <div className="flex items-center gap-1">
                {[1, 2, 5, 10].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTicketsPerEntry(val)}
                    className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
                      ticketsPerEntry === val
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {val} б.
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-zinc-500">
              Если зритель напишет 2 раза при {ticketsPerEntry} б. — на рулетке у него станет {ticketsPerEntry * 2} баллов.
            </div>
          </div>
        )}

        {/* Channel Points (Optional Twitch Rewards) */}
        {appMode === 'auction' && (
          <div className="flex flex-col gap-2 p-3 bg-[#0d0d0f] border border-zinc-800/90 rounded-lg">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <Gift className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-200">Баллы канала Twitch</span>
              </div>
              <input
                type="checkbox"
                checked={enableChannelPoints}
                onChange={(e) => setEnableChannelPoints(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-0"
              />
            </label>

            {enableChannelPoints && (
              <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/60">
                {rewardsList && rewardsList.length > 0 ? (
                  <div>
                    <label className="block mb-1 text-[11px] text-zinc-400">Награда:</label>
                    <select
                      value={selectedRewardId}
                      onChange={(e) => setSelectedRewardId(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs text-white bg-zinc-900 border border-zinc-700 rounded focus:outline-none"
                    >
                      <option value="ALL">Любая награда канала</option>
                      {rewardsList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.cost} баллов)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-500">
                    {twitchUser
                      ? 'Прием наград активен.'
                      : 'Авторизуйтесь через Twitch для синхронизации наград канала.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Кнопка «КРУТИТЬ КОЛЕСО» */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={onSpin}
          disabled={isSpinning || participants.length === 0}
          className={`flex items-center justify-center gap-2.5 w-full py-3.5 text-sm font-bold tracking-wider uppercase rounded-xl transition-all ${
            isSpinning || participants.length === 0
              ? 'bg-zinc-800/60 text-zinc-600 cursor-not-allowed border border-zinc-800'
              : 'bg-white text-black hover:bg-zinc-200'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          {isSpinning ? 'Колесо вращается...' : `Крутить колесо (${participants.length})`}
        </button>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 text-xs text-zinc-400 px-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRemoveWinner}
                onChange={(e) => setAutoRemoveWinner(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-0"
              />
              <span className="text-[11px] text-zinc-400">Исключать победителя из пула</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={onShuffleParticipants}
                disabled={participants.length <= 1}
                className="flex items-center gap-1 px-2.5 py-1 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded transition-colors disabled:opacity-40"
              >
                <Shuffle className="w-3 h-3" />
                Перемешать
              </button>
              <button
                onClick={onClearParticipants}
                disabled={participants.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 text-zinc-400 hover:text-rose-400 bg-zinc-900 border border-zinc-800 rounded transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" />
                Очистить
              </button>
            </div>
          </div>

          {/* Voiceover & Mode indicator */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={voiceoverEnabled}
                onChange={(e) => setVoiceoverEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-0"
              />
              <span className="text-[11px] text-zinc-400">
                Озвучка победителя голосом
              </span>
            </label>

            <span className="text-[10px] text-zinc-500 font-mono">
              {appMode === 'auction' ? `Аукцион: +${ticketsPerEntry} б./соо` : 'Прокачки: 1 чел = 1 шанс'}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Список участников (скрывается если вынесен наверх в режиме Аукциона) */}
      {!hideParticipantList && (
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>В пуле: {participants.length}</span>
            </div>
            <button
              onClick={() => setShowBulkModal(true)}
              className="text-xs text-zinc-400 hover:text-white underline"
            >
              + вставить список
            </button>
          </div>

          {/* Manual quick add */}
          <form onSubmit={handleManualAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="Вписать ник вручную..."
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs text-white bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </button>
          </form>

          {participants.length === 0 ? (
            <div className="py-4 text-xs text-center text-zinc-500 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-lg">
              Список пуст. Включите интеграцию или добавьте ники вручную.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-zinc-900/40 border border-zinc-800/80 rounded-lg">
              {(() => {
                const totalTickets = participants.reduce((s, p) => s + (p.tickets || 1), 0);
                return participants.map((p, idx) => {
                  const name = p.name || p;
                  const tickets = p.tickets || 1;
                  const percent = totalTickets > 0 ? Math.round((tickets / totalTickets) * 100) : 0;

                  if (appMode === 'auction') {
                    return (
                      <span
                        key={`${name}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-200 bg-zinc-800/80 border border-zinc-700/60 rounded-lg"
                      >
                        <span className="text-zinc-500 text-[10px]">#{idx + 1}</span>
                        <span className="font-semibold text-white max-w-[100px] truncate" title={name}>
                          {name}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">({percent}%)</span>
                        <div className="flex items-center gap-1 ml-1">
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={tickets}
                            onChange={(e) => onSetTickets(name, e.target.value)}
                            className="w-12 px-1 py-0.5 text-xs font-mono font-bold text-center text-white bg-zinc-900 border border-zinc-700 rounded focus:outline-none focus:border-zinc-400"
                            title="Задать баллы вручную (например: 1, 5, 10)"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateTickets(name, -1)}
                            className="w-4 h-4 flex items-center justify-center text-[10px] text-zinc-400 hover:text-white bg-zinc-900 rounded hover:bg-zinc-700"
                            title="-1 балл"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateTickets(name, 1)}
                            className="w-4 h-4 flex items-center justify-center text-[10px] text-zinc-400 hover:text-white bg-zinc-900 rounded hover:bg-zinc-700"
                            title="+1 балл"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveParticipant(name)}
                            className="p-0.5 ml-0.5 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                            title="Удалить"
                          >
                            ✕
                          </button>
                        </div>
                      </span>
                    );
                  }

                  // Carry mode (flat 1 entry)
                  return (
                    <span
                      key={`${name}-${idx}`}
                      className="inline-flex items-center gap-2 px-2.5 py-1 text-xs text-zinc-200 bg-zinc-800/80 border border-zinc-700/60 rounded-lg"
                    >
                      <span className="text-zinc-500 text-[10px]">#{idx + 1}</span>
                      <span className="font-medium text-white max-w-[130px] truncate" title={name}>
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
                });
              })()}
            </div>
          )}
        </div>
      )}

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
                onClick={handleBulkAdd}
                className="px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Добавить всех
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-[#16161a] border border-zinc-800 rounded-xl shadow-2xl">
            <h3 className="mb-1 text-sm font-semibold text-white">Настройки Twitch Client ID</h3>
            <p className="mb-4 text-xs text-zinc-400 leading-relaxed">
              Укажите Client ID вашего Twitch приложения (из dev.twitch.tv/console) для официальной авторизации.
            </p>

            <div className="mb-4">
              <label className="block mb-1 text-xs text-zinc-300">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value.trim())}
                className="w-full px-3 py-2 text-xs font-mono text-white bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
