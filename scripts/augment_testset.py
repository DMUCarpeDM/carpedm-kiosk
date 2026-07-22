"""테스트셋 합성 증강 — LLM으로 어르신 화법 변형 발화 생성.

⚠ 정직 원칙: 합성 데이터는 '강건성 측정'의 보조 수단이며 현장 데이터를 대체하지 않는다.
   생성 케이스에는 source="synthetic-llm" 이 박혀 원본과 항상 구분된다.
   보고서에는 원본 100건 결과와 증강셋 결과를 분리 표기할 것.

사용:
  python scripts/augment_testset.py --dry-run                  # 프롬프트 미리보기 (키 불필요)
  ANTHROPIC_API_KEY=... python scripts/augment_testset.py --n 2 --tags dict,attr,qty,name
  python scripts/measure.py --provider claude --testset data/testset_augmented.jsonl
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SYSTEM = (
    "너는 한국어 음성 데이터 증강 도우미다. 주어진 '주문 발화'와 같은 의미(같은 품목·수량)를 가진, "
    "70~80대 어르신이 실제로 말할 법한 자연스러운 변형 문장을 만든다. "
    "조건: 존댓말/반말/간접 표현을 섞고, 가벼운 구어체와 군말(어, 저기)을 허용한다. "
    "과장된 사투리 희화화나 비하 표현은 금지. 메뉴 의미를 바꾸지 않는다. "
    "출력은 JSON 문자열 배열 하나만. 다른 텍스트 금지."
)


def gen_variants(client, model: str, utterance: str, n: int) -> list[str]:
    msg = client.messages.create(
        model=model,
        max_tokens=400,
        temperature=0.8,
        system=SYSTEM,
        messages=[{"role": "user", "content": f'원 발화: "{utterance}"\n변형 {n}개를 JSON 배열로.'}],
    )
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    text = re.sub(r"```(?:json)?", "", text)
    start, end = text.find("["), text.rfind("]")
    arr = json.loads(text[start : end + 1])
    return [str(s).strip() for s in arr if str(s).strip()][:n]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=2, help="케이스당 변형 수")
    ap.add_argument("--tags", default="dict,attr,qty,name", help="증강 대상 태그")
    ap.add_argument("--limit", type=int, default=0, help="대상 케이스 수 제한 (0=전체)")
    ap.add_argument("--testset", default=str(ROOT / "data" / "testset.jsonl"))
    ap.add_argument("--out", default=str(ROOT / "data" / "testset_augmented.jsonl"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    tags = {t.strip() for t in args.tags.split(",")}
    cases = [json.loads(l) for l in Path(args.testset).read_text(encoding="utf-8").splitlines() if l.strip()]
    targets = [c for c in cases if c["tag"] in tags and c["expected"]["action"] == "update"]
    if args.limit:
        targets = targets[: args.limit]

    print(f"원본 {len(cases)}건 / 증강 대상 {len(targets)}건 × 변형 {args.n} = 약 {len(targets)*args.n}건 추가 예정")
    if args.dry_run:
        ex = targets[0]
        print("\n[프롬프트 미리보기]")
        print("system:", SYSTEM)
        print(f'user: 원 발화: "{ex["utterance"]}" / 변형 {args.n}개를 JSON 배열로.')
        print("\n--dry-run 종료 (API 호출 없음)")
        return 0

    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY 필요 (.env 또는 환경변수). 미리보기는 --dry-run.")
    import anthropic

    client = anthropic.Anthropic()
    model = os.getenv("KIOSK_MODEL", "claude-sonnet-4-6")

    out_cases = list(cases)
    made = 0
    for c in targets:
        try:
            for i, v in enumerate(gen_variants(client, model, c["utterance"], args.n), 1):
                out_cases.append(
                    {
                        **c,
                        "id": f'{c["id"]}-a{i}',
                        "utterance": v,
                        "source": "synthetic-claude",
                    }
                )
                made += 1
        except Exception as e:  # 한 케이스 실패가 전체를 막지 않게
            print(f'  ! {c["id"]} 생성 실패: {type(e).__name__}: {e}')

    Path(args.out).write_text(
        "\n".join(json.dumps(c, ensure_ascii=False) for c in out_cases) + "\n", encoding="utf-8"
    )
    print(f"생성 {made}건 → {args.out} (원본 {len(cases)} + 합성 {made})")
    print("측정: python scripts/measure.py --provider claude --testset", args.out)
    print("보고서에는 원본/합성 결과를 분리 표기할 것 (source 필드로 구분 가능)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
