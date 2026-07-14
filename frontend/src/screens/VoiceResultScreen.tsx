import { useEffect } from "react";
import { menuById, menuDisplayName } from "../api";
import { MicButton, recommendReason } from "../components";
import { IconSpeaker } from "../icons";
import { menuImageSrc } from "../menuImages";
import { playSpeech, stopAllAudio } from "../speech";
import type { CartItem, MenuItem, VoiceResultView } from "../types";

type Props = {
  utterance: string;
  view: VoiceResultView;
  menu: MenuItem[];
  cart: CartItem[];
  /** 서버 TTS 오디오 (없으면 브라우저 TTS로 자막을 읽어준다) */
  say?: string;
  audioB64?: string | null;
  audioMime?: string;
  onRetry: () => void;
  onConfirm: () => void;
  onOpenMenu: () => void;
  onPickSuggestion: (id: string) => void;
};

function cartTotal(cart: CartItem[], menu: MenuItem[]): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const c of cart) {
    const m = menuById(menu, c.id);
    if (m) {
      count += c.qty;
      total += m.price * c.qty;
    }
  }
  return { count, total };
}

export function VoiceResultScreen({
  utterance,
  view,
  menu,
  cart,
  say,
  audioB64,
  audioMime,
  onRetry,
  onConfirm,
  onOpenMenu,
  onPickSuggestion,
}: Props) {
  const spoken = say ?? (view.kind === "clarify" || view.kind === "reject" ? view.text : view.say);
  const { count, total } = cartTotal(cart, menu);

  // 안내 음성 재생 + 자막 동시 표시 (청각 보조)
  useEffect(() => {
    if (spoken || audioB64) void playSpeech(spoken ?? "", audioB64, audioMime);
    return () => stopAllAudio();
  }, [spoken, audioB64, audioMime]);

  return (
    <div className="lk-result">
      <section className="lk-quote">
        <p className="lk-quote__label">말씀하신 내용</p>
        <p className="lk-quote__text">“{utterance}”</p>
      </section>

      {spoken ? (
        <section className="lk-subtitle" aria-live="polite">
          <span className="lk-subtitle__icon">
            <IconSpeaker size={30} />
          </span>
          <p className="lk-subtitle__text">{spoken}</p>
        </section>
      ) : null}

      <div className="lk-result__center">
        {view.kind === "cart" ? (
          // 여러 개를 한 번에 말해도 전부 보이도록 장바구니 전체를 목록으로 — 방금 담긴 것은 강조
          <div className="lk-cartlist" role="list" aria-label="담은 메뉴">
            {cart.map((c) => {
              const m = menuById(menu, c.id);
              if (!m) return null;
              const changed = view.changedIds.includes(c.id);
              return (
                <div key={c.id} role="listitem" className={`lk-cartrow${changed ? " lk-cartrow--new" : ""}`}>
                  <span className="lk-cartrow__img">
                    <img src={menuImageSrc(m)} alt="" />
                  </span>
                  <span className="lk-cartrow__body">
                    <span className="lk-cartrow__name">{menuDisplayName(m)}</span>
                    <span className="lk-cartrow__qty">
                      {c.qty}개 · {(m.price * c.qty).toLocaleString("ko-KR")}원
                    </span>
                  </span>
                  {changed ? <span className="lk-cartrow__badge">방금 담음</span> : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {view.kind === "recommend" ? (
          <div className="lk-suggests">
            {view.menuIds.map((id) => {
              const m = menuById(menu, id);
              if (!m) return null;
              return (
                <button key={id} type="button" className="lk-suggest" onClick={() => onPickSuggestion(id)}>
                  <span className="lk-suggest__reason">{recommendReason(m)}</span>
                  <span className="lk-suggest__img">
                    <img src={menuImageSrc(m)} alt="" />
                  </span>
                  <span className="lk-suggest__name">{menuDisplayName(m)}</span>
                  {m.desc ? <span className="lk-suggest__desc">{m.desc}</span> : null}
                  <span className="lk-suggest__price">{m.price.toLocaleString("ko-KR")}원</span>
                  <span className="lk-suggest__cta">이걸로 담기</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {view.kind === "clarify" || view.kind === "reject" ? (
          <div className="lk-message">
            <p className="lk-message__text">{view.text}</p>
          </div>
        ) : null}
      </div>

      {cart.length > 0 ? (
        <div className="lk-result__cartline">
          <span>담은 메뉴 {count}개</span>
          <strong>{total.toLocaleString("ko-KR")}원</strong>
        </div>
      ) : null}

      <div className="lk-result__microw">
        <MicButton active={false} onClick={onRetry} />
        <p className="lk-result__michint">버튼을 누르고 이어서 말씀해 주세요</p>
      </div>

      <div className="lk-paybar">
        <button type="button" className="lk-paybar__btn lk-paybar__btn--ghost" onClick={onOpenMenu}>
          메뉴판 보기
        </button>
        <button
          type="button"
          className="lk-paybar__btn lk-paybar__btn--pay"
          onClick={onConfirm}
          disabled={cart.length === 0}
        >
          {cart.length === 0 ? "메뉴를 선택해 주세요" : `${total.toLocaleString("ko-KR")}원 결제하기`}
        </button>
      </div>
    </div>
  );
}
