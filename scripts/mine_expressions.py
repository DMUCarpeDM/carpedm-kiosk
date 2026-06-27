"""공공 데이터 표현 마이닝 — AI Hub 등 전사 데이터에서 '주문/음식 관련 발화' 후보 추출.

대상: AI Hub 자유대화 음성(노인남녀, dataSetSn=107) 등의 라벨 데이터 (json/jsonl/txt).
⚠ 데이터셋마다 JSON 필드명이 다르다. 이 스크립트는 특정 스키마를 가정하지 않고
   JSON 안의 '한글 문자열'을 재귀적으로 수집한 뒤 키워드로 거른다.
   필드명을 알게 되면 --text-keys 로 좁혀서 정밀도를 올릴 것.

사용:
  python scripts/mine_expressions.py --input ~/aihub_107/labels \\
      [--keywords data/mine_keywords.txt] [--text-keys stt,orgtext,발화문] \\
      [--out reports/expression_candidates.csv]

출력: 검수용 CSV (utf-8-sig, 엑셀 호환) — 사람이 검수해 data/expressions.yaml 에 반영한다.
파이프라인: 다운로드 → 본 스크립트 → 검수 → expressions.yaml 갱신 → measure.py 전/후 비교.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

HANGUL_RE = re.compile(r"[가-힣]")


def load_keywords(path: Path) -> list[str]:
    kws = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            kws.append(line)
    if not kws:
        sys.exit("키워드 파일이 비어 있습니다.")
    return kws


def harvest_strings(obj, text_keys: set[str] | None, out: list[str]) -> None:
    """JSON 트리에서 후보 문자열 수집. text_keys가 있으면 해당 키의 값만."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str):
                if (text_keys is None or k in text_keys) and HANGUL_RE.search(v):
                    out.append(v)
            else:
                harvest_strings(v, text_keys, out)
    elif isinstance(obj, list):
        for v in obj:
            harvest_strings(v, text_keys, out)


def iter_utterances(path: Path, text_keys: set[str] | None):
    if path.suffix.lower() == ".txt":
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            if HANGUL_RE.search(line):
                yield line.strip()
    elif path.suffix.lower() in {".json", ".jsonl"}:
        text = path.read_text(encoding="utf-8", errors="ignore")
        try:
            objs = [json.loads(text)]
        except json.JSONDecodeError:  # jsonl
            objs = []
            for line in text.splitlines():
                line = line.strip()
                if line:
                    try:
                        objs.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        bucket: list[str] = []
        for o in objs:
            harvest_strings(o, text_keys, bucket)
        yield from (s.strip() for s in bucket)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="라벨 파일 또는 디렉터리")
    ap.add_argument("--keywords", default="data/mine_keywords.txt")
    ap.add_argument("--text-keys", default="", help="쉼표 구분 JSON 필드명 (비우면 전체 문자열)")
    ap.add_argument("--out", default="reports/expression_candidates.csv")
    ap.add_argument("--min-chars", type=int, default=4)
    ap.add_argument("--max-chars", type=int, default=60, help="주문형 짧은 발화 위주로 거름")
    args = ap.parse_args()

    root = Path(args.input)
    files = [root] if root.is_file() else sorted(
        p for p in root.rglob("*") if p.suffix.lower() in {".json", ".jsonl", ".txt"}
    )
    if not files:
        sys.exit(f"입력에서 json/jsonl/txt 파일을 찾지 못함: {root}")

    keywords = load_keywords(Path(args.keywords))
    text_keys = {k.strip() for k in args.text_keys.split(",") if k.strip()} or None

    seen: set[str] = set()
    rows: list[tuple[str, str, str]] = []
    scanned = 0
    for f in files:
        for utt in iter_utterances(f, text_keys):
            scanned += 1
            if not (args.min_chars <= len(utt) <= args.max_chars):
                continue
            hits = [k for k in keywords if k in utt]
            if hits and utt not in seen:
                seen.add(utt)
                rows.append((utt, "|".join(hits), f.name))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8-sig") as fh:  # 엑셀 검수 호환
        w = csv.writer(fh)
        w.writerow(["발화(그대로)", "걸린 키워드", "출처 파일", "검수: 의도 메뉴 id", "검수: 채택여부"])
        for r in rows:
            w.writerow([*r, "", ""])

    print(f"파일 {len(files)}개 / 문자열 {scanned}개 스캔 → 후보 {len(rows)}건")
    print(f"→ {out}  (엑셀로 열어 '의도 메뉴 id'와 채택여부를 채운 뒤 expressions.yaml에 반영)")
    print("→ 반영 후: python scripts/measure.py 로 교체 전/후 정확도 비교를 기록할 것")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
