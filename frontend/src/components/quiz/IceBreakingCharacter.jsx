import { useRive } from '@rive-app/react-canvas';
import { playCappedAudio } from '../../utils/sounds';

export default function IceBreakingCharacter({ artboardName, soundUrl, onInteract, disabled, hidden }) {
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}animojis.riv`,
    artboard: artboardName,
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  const playSound = () => {
    if (!soundUrl) return;
    playCappedAudio(soundUrl);
  };

  const handleInteract = () => {
    if (disabled) return;
    if (onInteract) onInteract();
    playSound();
    if (rive) {
      try {
        const inputs = rive.stateMachineInputs('State Machine 1');
        const pressedInput = inputs.find(i => i.name.toLowerCase().includes('press') || i.name.toLowerCase().includes('click'));
        if (pressedInput) pressedInput.fire();
      } catch (e) {}
    }
  };
  
  const handleHover = (isHover) => {
    if (disabled || !rive) return;
    try {
      const inputs = rive.stateMachineInputs('State Machine 1');
      const hoverInput = inputs.find(i => i.name.toLowerCase().includes('hover'));
      if (hoverInput && hoverInput.type === 0) hoverInput.value = isHover;
    } catch (e) {}
  };

  return (
    <div 
      style={{ 
        width: 'clamp(80px, 25vw, 150px)', 
        height: 'clamp(80px, 25vw, 150px)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 0.3s'
      }}
      onClick={handleInteract}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      <RiveComponent />
    </div>
  );
}
