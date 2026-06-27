import { CompletionPanel } from "../components";

type Props = {
  onHome: () => void;
};

export function OrderCompleteScreen({ onHome }: Props) {
  return (
    <div className="screen screen--complete">
      <CompletionPanel onHome={onHome} />
    </div>
  );
}
