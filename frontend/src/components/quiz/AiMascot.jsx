import { useRive } from '@rive-app/react-canvas';

export const AiMascotInner = ({ artboardName }) => {
  const { RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}animojis.riv`,
    artboard: artboardName,
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  return (
    <div style={{ width: '120px', height: '120px', margin: '0 auto 1rem auto' }}>
      <RiveComponent />
    </div>
  );
};

export default function AiMascot({ quizState }) {
  let artboardName = 'Animoji-Wizard';
  if (quizState === 'wrong') artboardName = 'Animoji-Exhausted';
  if (quizState === 'correct') artboardName = 'Animoji-Stakeholder';

  return <AiMascotInner key={artboardName} artboardName={artboardName} />;
}
