"""STT 평가 — (정답 전사, STT 결과) 쌍의 CER/WER 계산.

용도: AI Hub 노인 음성 샘플(n≈100)에 ① 클라우드 STT ② faster-whisper 를 각각 돌려
hyp 컬럼을 채운 CSV 두 개를 만들고, 본 스크립트로 CER을 비교 → STT 선택의 정량 근거.

CSV 형식: 헤더에 ref, hyp 컬럼 (이름 변경 시 --ref-col/--hyp-col).
CER은 한국어 관례대로 공백 제거 문자 기준이 기본 (--keep-space 로 변경).

사용:
  python scripts/eval_stt_cer.py --csv reports/stt_cloud.csv
  python scripts/eval_stt_cer.py --self-test
"""
from __future__ import annotations

import argparse
import csv
import statistics
import sys
from pathlib import Path


def edit_distance(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cer(ref: str, hyp: str, keep_space: bool = False) -> float:
    if not keep_space:
        ref, hyp = ref.replace(" ", ""), hyp.replace(" ", "")
    return edit_distance(ref, hyp) / max(1, len(ref))


def wer(ref: str, hyp: str) -> float:
    r, h = ref.split(), hyp.split()
    # 어절 단위 편집거리
    prev = list(range(len(h) + 1))
    for i, rw in enumerate(r, 1):
        cur = [i]
        for j, hw in enumerate(h, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (rw != hw)))
        prev = cur
    return prev[-1] / max(1, len(r))


def self_test() -> int:
    assert edit_distance("abc", "abc") == 0
    assert edit_distance("abc", "axc") == 1
    assert abs(cer("아이스 아메리카노", "아이스 아메리카노") - 0.0) < 1e-9
    assert abs(cer("아메리카노", "아메리까노") - 0.2) < 1e-9  # 5자 중 1자
    assert abs(wer("커피 하나 줘", "커피 둘 줘") - (1 / 3)) < 1e-9
    print("self-test OK")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv")
    ap.add_argument("--ref-col", default="ref")
    ap.add_argument("--hyp-col", default="hyp")
    ap.add_argument("--keep-space", action="store_true")
    ap.add_argument("--out", default="reports/stt_eval.md")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not args.csv:
        sys.exit("--csv 또는 --self-test 필요")

    rows = list(csv.DictReader(open(args.csv, encoding="utf-8-sig")))
    if not rows:
        sys.exit("CSV가 비어 있음")
    scored = []
    for r in rows:
        ref, hyp = r[args.ref_col].strip(), r[args.hyp_col].strip()
        scored.append((cer(ref, hyp, args.keep_space), wer(ref, hyp), ref, hyp))

    cers = [s[0] for s in scored]
    wers = [s[1] for s in scored]
    worst = sorted(scored, reverse=True)[:10]
    lines = [
        "# STT 평가 리포트",
        "",
        f"- 표본: {len(scored)}건 (파일: {args.csv})",
        f"- **평균 CER: {statistics.mean(cers)*100:.1f}%** / 중앙값 {statistics.median(cers)*100:.1f}%",
        f"- 평균 WER: {statistics.mean(wers)*100:.1f}%",
        "",
        "## 최악 10건 (개선 단서)",
        *(f"- CER {c*100:.0f}% | 정답: {r} | 인식: {h}" for c, _, r, h in worst),
        "",
        "> 해석 가이드: 클라우드 vs faster-whisper 두 리포트의 평균 CER을 비교해 STT를 선택하고,",
        "> 최악 케이스의 패턴(고유명사·사투리·잡음)을 표현 사전/되묻기 설계에 반영한다.",
    ]
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:8]))
    print(f"→ {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
