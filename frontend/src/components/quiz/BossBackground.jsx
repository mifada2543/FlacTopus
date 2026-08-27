import { useEffect } from 'react';
import { useRive } from '@rive-app/react-canvas';

export default function BossBackground({ riveRef, isWaitingForBossClick, handleBossClick, isShaking }) {
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}boss.riv`,
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  useEffect(() => {
    if (rive && riveRef) {
      riveRef.current = rive;
    }
  }, [rive, riveRef]);

  return (
    <div 
      className={isShaking ? "shake-screen" : ""}
      style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundColor: '#fcd34d', cursor: isWaitingForBossClick ? 'crosshair' : 'default' }}
      onClickCapture={(e) => {
        if (isWaitingForBossClick) {
          handleBossClick();
        }
      }}
    >
      <RiveComponent style={{ width: '100vw', height: '100vh' }} />
      {isWaitingForBossClick && (
        <div className="attack-text">
          KLIK UNTUK MENYERANG!
        </div>
      )}
    </div>
  );
}
