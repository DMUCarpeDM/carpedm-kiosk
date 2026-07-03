"""매핑 정확도 측정 (FR-D2) — 1순위 지표.

사용:
  python scripts/measure.py --provider rule           # 오프라인 폴백 기준선
  ANTHROPIC_API_KEY=... python scripts/measure.py --provider claude   # 실제 지표
  python scripts/measure.py --provider claude --strict # SRS 목표 미달 시 exit 1

판정 규칙:
- action 일치 필수
- expected.action == update 인 경우 장바구니 완전 일치(병합·정렬 후 비교)
- clarify/reject/confirm 은 action 만 비교 (문구는 비교하지 않음)
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from backend.interpreter import (  # noqa: E402
    CartItem,
    load_expressions,
    load_menu,
    make_provider,
)

TARGET_OVERALL = 0.90  # SRS 제안 목표 (팀 설정값)
TARGET_MULTI = 0.85


def norm_cart(cart) -> list[tuple[str, int]]:
    merged: dict[str, int] = {}
    for c in cart:
        d = c.model_dump() if isinstance(c, CartItem) else dict(c)
        merged[d["id"]] = merged.get(d["id"], 0) + int(d["qty"])
    return sorted(merged.items())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", default="auto", choices=["auto", "rule", "claude"])
    ap.add_argument("--strict", action="store_true", help="목표 미달 시 종료코드 1")
    ap.add_argument("--testset", default=str(ROOT / "data" / "testset.jsonl"))
    args = ap.parse_args()

    menu = load_menu()
    expressions = load_expressions()
    provider = make_provider(args.provider)

    cases = [json.loads(line) for line in Path(args.testset).read_text(encoding="utf-8").splitlines() if line.strip()]

    by_type: dict[str, list[bool]] = defaultdict(list)
    by_tag: dict[str, list[bool]] = defaultdict(list)
    failures: list[dict] = []
    t0 = time.perf_counter()

    for case in cases:
        cart_before = [CartItem(**c) for c in case["cart_before"]]
        exp = case["expected"]
        try:
            got = provider.interpret(case["utterance"], cart_before, menu, expressions)
            # expected.action은 문자열 또는 허용 목록(list) — 예: 성질 표현은 clarify/recommend 모두 정답
            exp_actions = exp["action"] if isinstance(exp["action"], list) else [exp["action"]]
            ok = got.action in exp_actions
            if ok and got.action == "update" and "cart" in exp:
                ok = norm_cart(got.cart) == norm_cart(exp["cart"])
            got_desc = {"action": got.action, "cart": norm_cart(got.cart)}
        except Exception as e:
            ok, got_desc = False, {"error": f"{type(e).__name__}: {e}"}
        by_type[case["type"]].append(ok)
        by_tag[case["tag"]].append(ok)
        if not ok:
            failures.append({"id": case["id"], "utterance": case["utterance"], "expected": exp, "got": got_desc})

    elapsed = time.perf_counter() - t0
    total = sum(len(v) for v in by_type.values())
    correct = sum(sum(v) for v in by_type.values())
    overall = correct / total if total else 0.0
    multi_list = by_type.get("multi", [])
    multi_acc = (sum(multi_list) / len(multi_list)) if multi_list else 0.0

    def pct(xs: list[bool]) -> str:
        return f"{(sum(xs) / len(xs)) * 100:.1f}% ({sum(xs)}/{len(xs)})" if xs else "-"

    lines = [
        "# 매핑 정확도 리포트",
        "",
        f"- provider: **{provider.name}**" + ("  ⚠ rule은 오프라인 폴백 기준선입니다. SRS 목표는 claude 기준." if provider.name == "rule" else ""),
        f"- 케이스: {total}건 / 소요: {elapsed:.1f}s",
        f"- **전체 정확도: {overall*100:.1f}%** (목표 ≥{TARGET_OVERALL*100:.0f}%)",
        f"- 멀티턴 정확도: {multi_acc*100:.1f}% (목표 ≥{TARGET_MULTI*100:.0f}%)",
        "",
        "## 유형별",
        *(f"- {k}: {pct(v)}" for k, v in sorted(by_type.items())),
        "",
        "## 태그별",
        *(f"- {k}: {pct(v)}" for k, v in sorted(by_tag.items())),
        "",
        f"## 실패 케이스 ({len(failures)}건, 최대 30건 표시)",
        *(
            f"- `{f['id']}` \"{f['utterance']}\" → 기대 {json.dumps(f['expected'], ensure_ascii=False)} / 실제 {json.dumps(f['got'], ensure_ascii=False)}"
            for f in failures[:30]
        ),
        "",
    ]
    report = "\n".join(lines)
    out = ROOT / "reports"
    out.mkdir(exist_ok=True)
    (out / "accuracy.md").write_text(report, encoding="utf-8")
    print(report)

    if args.strict and (overall < TARGET_OVERALL or multi_acc < TARGET_MULTI):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
