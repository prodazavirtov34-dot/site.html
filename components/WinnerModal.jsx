import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Trash2, RotateCcw, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export const WinnerModal = ({
  winner,
  onClose,
  onRemoveWinner,
  onSpinAgain,
  onReroll,
  winnerResponse, // { answered: boolean, message: string, timestamp: number }
  responseSecondsLeft = 60,
  onSimulateWinnerResponse,
}) => {
  useEffect(() => {
    if (!winner) return;

    // Minimalist confetti
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 0.7 },
        colors: ['#ffffff', '#a1a1aa', '#71717a', '#e4e4e7'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 0.7 },
        colors: ['#ffffff', '#a1a1aa', '#71717a', '#e4e4e7'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [winner]);

  if (!winner) return null;

  const winnerName = winner.name || winner;
  const isAnswered = winnerResponse?.answered;
  const isTimeOut = !isAnswered && responseSecondsLeft <= 0;

  const messagesList =
    winnerResponse?.messages && winnerResponse.messages.length > 0
      ? winnerResponse.messages
      : winnerResponse?.message
      ? [{ id: 1, text: winnerResponse.message, timestamp: winnerResponse.timestamp }]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 text-center bg-[#141417] border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Minimal Trophy Icon */}
        <div className="inline-flex items-center justify-center w-12 h-12 mb-3 bg-zinc-800 border border-zinc-700 rounded-full">
          <Trophy className="w-5 h-5 text-white" />
        </div>

        {/* Title */}
        <div className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-1">
          Победитель рулетки
        </div>

        {/* Winner Name */}
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-white break-words">
          {winnerName}
        </h2>

        {/* Response in Twitch Chat Tracker */}
        <div className="my-4">
          {isAnswered ? (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-left flex flex-col gap-2 shadow-lg">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Сообщения в чате Twitch ({messagesList.length}):
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {messagesList.length > 0 &&
                    new Date(messagesList[messagesList.length - 1].timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                </span>
              </div>

              {/* Scrollable list of all messages */}
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {messagesList.map((msg, mIdx) => (
                  <div
                    key={msg.id || mIdx}
                    className="flex items-start justify-between gap-2 text-xs font-mono text-white bg-black/60 p-2 rounded-lg border border-emerald-500/20 break-words"
                  >
                    <div className="flex items-start gap-1.5 min-w-0">
                      <span className="text-emerald-400 font-bold select-none">#{mIdx + 1}</span>
                      <span className="break-words">« {msg.text || msg.message} »</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 shrink-0 select-none pt-0.5 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-emerald-300/80 pt-1 border-t border-emerald-500/20 flex items-center justify-between">
                <span>✅ Все сообщения сохраняются на экране</span>
                {onSimulateWinnerResponse && (
                  <button
                    type="button"
                    onClick={() => onSimulateWinnerResponse(`еще сообщение: готов играть`)}
                    className="text-[10px] text-emerald-400 hover:text-white underline cursor-pointer"
                  >
                    + тест еще сообщения
                  </button>
                )}
              </div>
            </div>
          ) : isTimeOut ? (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-left">
              <div className="text-xs text-rose-400 font-semibold mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Время на ответ вышло! Участник не написал в чат.
              </div>
              <div className="text-[11px] text-zinc-400">
                Зритель не отозвался в чате стрима. Нажмите «Реролл», чтобы исключить его и перекрутить.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col gap-1.5 text-left">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                  Ожидание ответа в чате Twitch...
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    responseSecondsLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-zinc-200'
                  }`}
                >
                  00:{responseSecondsLeft < 10 ? `0${responseSecondsLeft}` : responseSecondsLeft}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>
                  Как только <strong className="text-zinc-300">{winnerName}</strong> напишет хоть слово в чат — его сообщение появится здесь.
                </span>
                {onSimulateWinnerResponse && (
                  <button
                    onClick={() => onSimulateWinnerResponse('я тут! го играть')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 underline shrink-0 ml-2"
                    title="Проверить виджет ответа (симуляция)"
                  >
                    тест ответа
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Reroll button if AFK or want another winner */}
          <button
            onClick={() => {
              onReroll ? onReroll(winner) : onSpinAgain();
            }}
            className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold rounded-lg transition-colors ${
              isTimeOut
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isTimeOut ? 'Реролл (исключить и перекрутить)' : 'Реролл / Крутить снова'}
          </button>

          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Принять победителя и закрыть
          </button>

          <button
            onClick={() => {
              onRemoveWinner(winner);
              onClose();
            }}
            className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-rose-400 transition-colors"
          >
            Исключить из списка
          </button>
        </div>
      </div>
    </div>
  );
};
