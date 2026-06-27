import {
  IconCup,
  IconMic,
  KioskHeader,
  KioskHeaderSettings,
  PrimaryChoiceButton,
} from "../components";

type Props = {
  onVoiceOrder: () => void;
  onMenuSelect: () => void;
};

export function MainScreen({ onVoiceOrder, onMenuSelect }: Props) {
  return (
    <div className="screen screen--main">
      <KioskHeader right={<KioskHeaderSettings />} />
      <main className="main-hero">
        <PrimaryChoiceButton
          variant="primary"
          icon={<IconMic />}
          label="음성주문"
          onClick={onVoiceOrder}
        />
        <PrimaryChoiceButton
          variant="secondary"
          icon={<IconCup />}
          label="메뉴선택"
          onClick={onMenuSelect}
        />
      </main>
      <footer className="main-welcome">
        <span className="main-welcome__heart" aria-hidden="true">
          ♥
        </span>
        <p>어서오세요! 맛있는 하루 되세요.</p>
      </footer>
    </div>
  );
}
