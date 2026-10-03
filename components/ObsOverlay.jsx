import React, { useState, useEffect } from 'react';
import { Wheel } from './Wheel';
import { WinnerModal } from './WinnerModal';
import { syncService } from '../services/syncChannel';
import { sound } from '../services/sound';
import { Trophy, Users } from 'lucide-react';

export const ObsOverlay = () => {
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
  const [targetWinner, setTargetWinner] = useState(null);
  const [spinDuration, setSpinDuration] = useState(8000);

  // Synchronize with Control Panel
  useEffect(() => {
    const unsubscribe = syncService.subscribe((msg) => {
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'UPDATE_PARTICIPANTS':
          setParticipants(msg.payload.participants || []);
          break;

        case 'START_SPIN':
          setTargetWinner(msg.payload.targetWinner || null);
          setSpinDuration(msg.payload.spinDuration || 8000);
          setWinner(null);
          setIsSpinning(true);
          break;

        case 'RESET_WINNER':
          setWinner(null);
          break;

        case 'UPDATE_SETTINGS':
          if (typeof msg.payload.soundEnabled === 'boolean') {
            sound.setEnabled(msg.payload.soundEnabled);
          }
          break;

        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  const handleSpinEnd = (winningParticipant) => {
    setIsSpinning(false);
    setWinner(winningParticipant);
    syncService.send('OBS_SPIN_FINISHED', { winner: winningParticipant });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-transparent select-none p-4">
      {/* Participant Pill for Stream Viewers */}
      <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 bg-black/80 backdrop-blur-md border border-zinc-700/80 rounded-full shadow-lg">
        <Users className="w-3.5 h-3.5 text-zinc-300" />
        <span className="text-xs font-semibold text-zinc-200 tracking-wide uppercase">
          В рулетке: {participants.length}
        </span>
      </div>

      {/* The Wheel */}
      <div className="relative">
        <Wheel
          participants={participants}
          isSpinning={isSpinning}
          targetWinner={targetWinner}
          spinDuration={spinDuration}
          onSpinEnd={handleSpinEnd}
          size={560}
        />
      </div>

      {/* Winner Celebration Modal */}
      {winner && (
        <WinnerModal
          winner={winner}
          onClose={() => {
            setWinner(null);
            syncService.send('RESET_WINNER');
          }}
          onRemoveWinner={(w) => {
            syncService.send('REMOVE_WINNER', { winner: w });
            setWinner(null);
          }}
          onSpinAgain={() => {
            syncService.send('START_SPIN', { spinDuration });
          }}
        />
      )}
    </div>
  );
};
