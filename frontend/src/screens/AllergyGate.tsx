import { useEffect, useMemo, useState } from "react";
import { fetchTtsAudio, menuById, menuDisplayName } from "../api";
import { IconCheck, IconWarning } from "../icons";
import { playSpeech, stopAllAudio } from "../speech";
import type { CartItem, MenuItem } from "../types";

/**
 * 결제 직전 알레르기 확인 게이트 (보고서 4.4 배려 기능).
 * 1단계: 주문에 든 알레르기 성분을 알려주고 여부를 묻는다.
 * 2단계: 성분이 든 메뉴를 하나씩 보여주고 뺄 수 있게 한다.
 */
type Props = {
  cart: CartItem[];
  menu: MenuItem[];
  onProceed: () => void;
  onRemoveItem: (id: string) => void;
  onOpenMenu: () => void;
  onCancel: () => void;
};

export function AllergyGate({ cart, menu, onProceed, onRemoveItem, onOpenMenu, onCancel }: Props) {
  const [step, setStep] = useState<"ask" | "review">("ask");

  const allergens = useMemo(() => {
    const set = new Set<string>();
    for (const c of cart) {
      for (const a of menuById(menu, c.id)?.allergens ?? []) set.add(a);
    }
    return [...set];
  }, [cart, menu]);

  const itemsWithAllergens = cart
    .map((c) => menuById(menu, c.id))
    .filter((m): m is MenuItem => Boolean(m && (m.allergens?.length ?? 0) > 0));

  // 음성 안내 + 자막 (한 번만)
  useEffect(() => {
    const say = `결제하기 전에 확인해 주세요. 주문하신 메뉴에 ${allergens.join(", ")} 성분이 들어 있어요. 알레르기가 있으신가요?`;
    let cancelled = false;
    void (async () => {
      const audio = await fetchTtsAudio(say);
      if (!cancelled) void playSpeech(say, audio?.b64, audio?.mime);
    })();
    return () => {
      cancelled = true;
      stopAllAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lk-modal-wrap" role="dialog" aria-modal="true" aria-label="알레르기 확인">
      <div className="lk-modal lk-modal--allergy">
        {step === "ask" ? (
          <>
            <span className="lk-modal__badge lk-modal__badge--warn">
              <IconWarning size={30} />
            </span>
            <h2 className="lk-modal__title">드시기 전에 확인해 주세요</h2>
            <p className="lk-modal__sub">주문하신 메뉴에 아래 성분이 들어 있어요.</p>
            <div className="lk-allergen-chips">
              {allergens.map((a) => (
                <span key={a} className="lk-allergen-chip">{a}</span>
              ))}
            </div>
            <p className="lk-modal__question">이 중에 알레르기가 있으신가요?</p>
            <div className="lk-modal__actions">
              <button type="button" className="lk-modal__btn lk-modal__btn--yes" onClick={onProceed}>
                없어요, 결제할게요
              </button>
              <button type="button" className="lk-modal__btn lk-modal__btn--no" onClick={() => setStep("review")}>
                있어요, 확인할래요
              </button>
              <button type="button" className="lk-modal__btn lk-modal__btn--plain" onClick={onCancel}>
                이전으로
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="lk-modal__title">어떤 메뉴를 뺄까요?</h2>
            <p className="lk-modal__sub">알레르기 성분이 든 메뉴예요. 빼실 메뉴를 눌러 주세요.</p>
            <div className="lk-allergy-rows">
              {itemsWithAllergens.length === 0 ? (
                <p className="lk-allergy-rows__done">
                  <IconCheck size={22} /> 알레르기 성분이 든 메뉴가 없어요. 안심하고 결제하세요.
                </p>
              ) : (
                itemsWithAllergens.map((m) => (
                  <div key={m.id} className="lk-allergy-row">
                    <div className="lk-allergy-row__info">
                      <span className="lk-allergy-row__name">{menuDisplayName(m)}</span>
                      <span className="lk-allergy-row__allergens">{(m.allergens ?? []).join(", ")}</span>
                    </div>
                    <button type="button" className="lk-allergy-row__remove" onClick={() => onRemoveItem(m.id)}>
                      이 메뉴 빼기
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="lk-modal__actions">
              {cart.length > 0 ? (
                <button type="button" className="lk-modal__btn lk-modal__btn--yes" onClick={onProceed}>
                  확인했어요, 결제할게요
                </button>
              ) : null}
              <button type="button" className="lk-modal__btn lk-modal__btn--no" onClick={onOpenMenu}>
                메뉴판에서 다시 고르기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
