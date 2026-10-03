import React, { useState } from 'react';
import { Users, Shuffle, Trash2, Plus, Coins, Trophy } from 'lucide-react';

export const AuctionTopBoard = ({
  participants = [],
  onUpdateTickets,
  onSetTickets,
  onRemoveParticipant,
  onClearParticipants,
  onShuffleParticipants,
  onAddParticipant,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const totalTickets = participants.reduce((sum, p) => sum + (p.tickets || 1), 0);

  // Sort participants by tickets descending to highlight auction leaders
  const sortedParticipants = [...participants].sort(
    (a, b) => (b.tickets || 1) - (a.tickets || 1)
  );

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onAddParticipant(manualInput.trim(), 'manual');
    setManualInput('');
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
    <div className="w-full p-4 sm:p-5 bg-[#121215] border border-zinc-800 rounded-2xl shadow-xl flex flex-col gap-4">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Игроки аукциона (на экране сверху)
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-full">
                {participants.length} чел.
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Общий банк: <strong className="text-white font-bold">{totalTickets}</strong> баллов • Чем больше баллов, тем шире сектор
            </p>
          </div>
        </div>

        {/* Quick actions & manual add */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleManualAdd} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Добавить ник..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-32 sm:w-44 px-2.5 py-1 text-xs text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-400 font-mono"
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+</span>
            </button>
          </form>

          <button
            onClick={() => setShowBulkModal(true)}
            className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
          >
            + список
          </button>

          <button
            onClick={onShuffleParticipants}
            disabled={participants.length <= 1}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors disabled:opacity-40"
            title="Перемешать участников"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearParticipants}
            disabled={participants.length === 0}
            className="p-1.5 text-zinc-400 hover:text-rose-400 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors disabled:opacity-40"
            title="Очистить всех"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Big Cells Grid (Ячейки больше!) */}
      {sortedParticipants.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
          Список аукциона пуст. Включите прием сообщений или добавьте ники вручную.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-64 overflow-y-auto pr-1">
          {sortedParticipants.map((p, idx) => {
            const name = p.name || p;
            const tickets = p.tickets || 1;
            const percent = totalTickets > 0 ? Math.round((tickets / totalTickets) * 100) : 0;
            const isTop1 = idx === 0 && sortedParticipants.length > 1;

            return (
              <div
                key={`${name}-${idx}`}
                className={`flex flex-col justify-between p-3 rounded-xl border transition-all ${
                  isTop1
                    ? 'bg-zinc-900/90 border-amber-500/40 shadow-sm shadow-amber-500/5'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Top Row: Rank, Name, Chance % */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isTop1
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span
                      className="text-sm font-bold text-white truncate font-mono"
                      title={name}
                    >
                      {name}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      isTop1
                        ? 'bg-amber-400 text-black font-extrabold'
                        : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {percent}%
                  </span>
                </div>

                {/* Progress bar of percentage */}
                <div className="w-full bg-zinc-800/80 rounded-full h-1.5 mb-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isTop1 ? 'bg-amber-400' : 'bg-zinc-400'
                    }`}
                    style={{ width: `${Math.max(4, percent)}%` }}
                  />
                </div>

                {/* Bottom Row: Direct Ticket Editing & Controls */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500 font-mono">Баллы:</span>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={tickets}
                      onChange={(e) => onSetTickets(name, e.target.value)}
                      className="w-14 h-7 text-xs font-mono font-extrabold text-center text-white bg-black/60 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-400"
                      title="Задать точное количество баллов (например: 1, 5, 20)"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateTickets(name, -1)}
                      className="w-6 h-7 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors"
                      title="-1 балл"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateTickets(name, 1)}
                      className="w-6 h-7 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors"
                      title="+1 балл"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveParticipant(name)}
                      className="w-6 h-7 flex items-center justify-center text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                      title="Удалить из аукциона"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-[#16161a] border border-zinc-800 rounded-xl shadow-2xl">
            <h3 className="mb-1 text-sm font-semibold text-white">Вставить список участников аукциона</h3>
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
    </div>
  );
};
