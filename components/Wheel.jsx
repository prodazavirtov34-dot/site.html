import React, { useEffect, useRef, useCallback } from 'react';
import { sound } from '../services/sound';

// Clean high-end monochrome graphite & slate palette
const MONOCHROME_PALETTE = [
  '#18181b', // Zinc 900
  '#27272a', // Zinc 800
  '#202024',
  '#2f2f35',
  '#1c1c20',
  '#2a2a30',
  '#242429',
  '#33333a',
];

export const Wheel = ({
  participants = [],
  isSpinning = false,
  onSpinStart,
  onSpinEnd,
  targetWinner = null,
  spinDuration = 8000,
  size = 520,
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const currentAngleRef = useRef(0);
  const lastPegIndexRef = useRef(-1);
  const flapperDeflectionRef = useRef(0);

  // Calculate slice angles for all participants based on tickets (шансы)
  const getSliceData = useCallback(() => {
    const count = participants.length;
    if (count === 0) return { totalTickets: 0, slices: [] };

    const totalTickets = participants.reduce((sum, p) => sum + Math.max(1, p.tickets || 1), 0);

    let cumAngle = 0;
    const slices = participants.map((p, idx) => {
      const tickets = Math.max(1, p.tickets || 1);
      const angleSpan = (Math.PI * 2) * (tickets / totalTickets);
      const startAngle = cumAngle;
      const endAngle = cumAngle + angleSpan;
      const midAngle = cumAngle + angleSpan / 2;
      const percent = Math.round((tickets / totalTickets) * 100);
      cumAngle += angleSpan;

      return {
        participant: p,
        index: idx,
        tickets,
        percent,
        angleSpan,
        startAngle,
        endAngle,
        midAngle,
        color: MONOCHROME_PALETTE[idx % MONOCHROME_PALETTE.length],
      };
    });

    return { totalTickets, slices };
  }, [participants]);

  const drawWheel = useCallback(
    (angle) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = size;
      const height = size;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 24;

      const { totalTickets, slices } = getSliceData();

      // 1. Draw Outer Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = '#0f0f12';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#27272a';
      ctx.stroke();
      ctx.restore();

      // Outer Minimalist Indicator Dots
      const pegCount = Math.max(16, slices.length * 2);
      for (let i = 0; i < pegCount; i++) {
        const pegAngle = (i / pegCount) * Math.PI * 2 + angle * 0.15;
        const px = centerX + (radius + 5) * Math.cos(pegAngle);
        const py = centerY + (radius + 5) * Math.sin(pegAngle);

        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#71717a' : '#3f3f46';
        ctx.fill();
      }

      // If no participants, show clean empty state
      if (slices.length === 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#121215';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#27272a';
        ctx.stroke();

        ctx.fillStyle = '#71717a';
        ctx.font = '500 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ожидание участников...', centerX, centerY);
        ctx.restore();
        return;
      }

      // 2. Draw Wheel Slices (Weighted by tickets / шансы)
      for (let i = 0; i < slices.length; i++) {
        const sl = slices[i];
        const startA = angle + sl.startAngle;
        const endA = angle + sl.endAngle;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startA, endA);
        ctx.closePath();

        ctx.fillStyle = sl.color;
        ctx.fill();

        // Dividing border
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#3f3f46';
        ctx.stroke();
        ctx.restore();

        // Draw Participant Name & Chance %
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + sl.midAngle);

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f4f4f5';

        let fontSize = 14;
        if (slices.length > 25) fontSize = 12;
        if (slices.length > 50) fontSize = 10;
        if (slices.length > 80) fontSize = 8;
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;

        const name = sl.participant.name || sl.participant;
        const label = sl.percent > 0 ? `${name} (${sl.percent}%)` : name;

        const maxTextWidth = radius - 55;
        let displayName = label;
        if (ctx.measureText(displayName).width > maxTextWidth) {
          while (ctx.measureText(displayName + '…').width > maxTextWidth && displayName.length > 2) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '…';
        }

        ctx.fillText(displayName, radius - 18, 0);
        ctx.restore();
      }

      // 3. Center Hub (Matte Obsidian)
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#09090b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3f3f46';
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#fafafa';
      ctx.fill();
      ctx.restore();

      // 4. Pointer at Top (12 o'clock)
      drawPointer(ctx, centerX, centerY - radius, flapperDeflectionRef.current);

      ctx.restore();
    },
    [getSliceData, size]
  );

  // Minimalist needle pointer
  const drawPointer = (ctx, tipX, tipY, deflection) => {
    ctx.save();
    ctx.translate(tipX, tipY + 6);
    ctx.rotate(deflection);

    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-10, -22);
    ctx.lineTo(10, -22);
    ctx.closePath();

    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#27272a';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -16, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#09090b';
    ctx.fill();

    ctx.restore();
  };

  // Spin animation loop with weighted chances
  useEffect(() => {
    if (!isSpinning || participants.length === 0) {
      drawWheel(currentAngleRef.current);
      return;
    }

    onSpinStart?.();

    const { totalTickets, slices } = getSliceData();
    if (slices.length === 0) return;

    // Pick winner proportionally to tickets (шансы)
    let winnerIndex = 0;
    if (targetWinner) {
      const idx = participants.findIndex(
        (p) => (p.name || p).toLowerCase() === targetWinner.toLowerCase()
      );
      winnerIndex = idx !== -1 ? idx : 0;
    } else {
      let rand = Math.random() * totalTickets;
      for (let i = 0; i < slices.length; i++) {
        if (rand < slices[i].tickets) {
          winnerIndex = i;
          break;
        }
        rand -= slices[i].tickets;
      }
    }

    const winnerSlice = slices[winnerIndex];
    const pointerAngle = (3 * Math.PI) / 2; // top 12 o'clock
    const extraSpins = 6 + Math.floor(Math.random() * 3);

    // Stop cleanly inside winner's slice
    const insideSliceOffset = winnerSlice.startAngle + winnerSlice.angleSpan * (0.25 + Math.random() * 0.5);
    const startAngle = currentAngleRef.current % (Math.PI * 2);
    const totalRotation = extraSpins * Math.PI * 2 + (pointerAngle - insideSliceOffset - startAngle);
    const finalTargetAngle = startAngle + totalRotation;

    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentA = startAngle + totalRotation * ease;
      currentAngleRef.current = currentA;

      // Calculate slice under needle for ticks
      const relativeAngle = ((pointerAngle - currentA) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      let currentSliceIdx = 0;
      for (let i = 0; i < slices.length; i++) {
        if (relativeAngle >= slices[i].startAngle && relativeAngle < slices[i].endAngle) {
          currentSliceIdx = i;
          break;
        }
      }

      if (currentSliceIdx !== lastPegIndexRef.current) {
        lastPegIndexRef.current = currentSliceIdx;
        sound.playTick();
        flapperDeflectionRef.current = 0.35;
      } else {
        flapperDeflectionRef.current *= 0.82;
      }

      drawWheel(currentA);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        flapperDeflectionRef.current = 0;
        drawWheel(finalTargetAngle);
        const winningParticipant = winnerSlice.participant;

        // Sound + Voiceover announcement
        sound.playWin();
        sound.speakWinner(winningParticipant.name || winningParticipant);

        onSpinEnd?.(winningParticipant, winnerIndex);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpinning, participants, spinDuration, targetWinner, getSliceData, drawWheel, onSpinStart, onSpinEnd]);

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [participants, drawWheel]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="transition-transform duration-300"
      />
    </div>
  );
};
