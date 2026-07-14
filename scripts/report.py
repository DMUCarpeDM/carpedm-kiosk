"""실증 로그 자동 집계 (FR-D5) — utterances.jsonl → reports/field_summary.md.

용도: 실증(경로당·복지관)에서 쌓인 발화 로그를 발표·보고서용 수치로 집계한다.
파이/태블릿 서버의 data/logs/utterances.jsonl 을 회수해 합친 뒤 실행하면 된다.

집계 항목: 발화·세션 수, 액션 분포, provider·폴백률, STT 성공률,
지연 분포(전체·단계별), 되묻기(clarify) 후 복구율, 최다 발화 목록.

정직성 원칙: 스모크 테스트 발화가 섞여 있으면 --exclude-utterance 로 제외하고,
제외 조건은 리포트에 그대로 기록된다. 수치는 로그에서만 도출한다.

사용:
  python scripts/report.py                                      # 전체 기간
  python scripts/report.py --from 2026-07-06 --to 2026-07-10    # 실증 기간(KST)
  python scripts/report.py --log /path/to/pi-utterances.jsonl \
      --exclude-utterance "불고기버거 세트 하나랑 콜라 두 개"    # 리허설 문장 제외
"""
from __future__ import annotations

import argparse
import json
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KST = timezone(timedelta(hours=9))


def parse_ts(raw: str) -> datetime | None:
    try:
        return datetime.fromisoformat(raw)
    except (TypeError, ValueError):
        return None


def load_events(path: Path) -> list[dict]:
    events = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        ts = parse_ts(rec.get("ts", ""))
        if ts is None:
            continue
        rec["_kst"] = ts.astimezone(KST)
        events.append(rec)
    return events


def dist(values: list[int]) -> str:
    """지연 분포 한 줄 요약 — 최소/중앙값/평균/p90/최대 (ms)."""
    if not values:
        return "데이터 없음"
    v = sorted(values)
    p90 = v[min(len(v) - 1, round(0.9 * (len(v) - 1)))]
    return (
        f"최소 {v[0]:,} / 중앙값 {round(statistics.median(v)):,} / "
        f"평균 {round(statistics.mean(v)):,} / p90 {p90:,} / 최대 {v[-1]:,} ms (n={len(v)})"
    )


def pct(part: int, whole: int) -> str:
    return f"{part / whole * 100:.1f}%" if whole else "—"


def main() -> None:
    ap = argparse.ArgumentParser(description="실증 로그 집계 리포트 생성")
    ap.add_argument("--log", type=Path, default=ROOT / "data/logs/utterances.jsonl")
    ap.add_argument("--out", type=Path, default=ROOT / "reports/field_summary.md")
    ap.add_argument("--from", dest="date_from", help="시작일 KST (YYYY-MM-DD, 포함)")
    ap.add_argument("--to", dest="date_to", help="종료일 KST (YYYY-MM-DD, 포함)")
    ap.add_argument(
        "--exclude-utterance", action="append", default=[],
        help="이 문자열을 포함한 발화 제외 (스모크 테스트 제거용, 반복 지정 가능)",
    )
    ap.add_argument(
        "--exclude-session", action="append", default=[],
        help="이 세션 id 제외 (반복 지정 가능)",
    )
    args = ap.parse_args()

    events = load_events(args.log)
    if args.date_from:
        lo = datetime.strptime(args.date_from, "%Y-%m-%d").replace(tzinfo=KST)
        events = [e for e in events if e["_kst"] >= lo]
    if args.date_to:
        hi = datetime.strptime(args.date_to, "%Y-%m-%d").replace(tzinfo=KST) + timedelta(days=1)
        events = [e for e in events if e["_kst"] < hi]

    excluded = 0
    kept = []
    for e in events:
        utt = e.get("utterance", "")
        if e.get("session") in args.exclude_session or any(x in utt for x in args.exclude_utterance):
            excluded += 1
            continue
        kept.append(e)
    events = sorted(kept, key=lambda e: e["_kst"])

    if not events:
        print("집계할 이벤트가 없습니다. --log 경로와 기간 필터를 확인하세요.")
        return

    interp = [e for e in events if "action" in e]           # 해석까지 간 발화
    stt_failed = [e for e in events if e.get("stage") == "stt_failed"]
    voice = [e for e in interp if e.get("stt_ms", 0) > 0]   # STT→해석→TTS 전체 파이프라인

    sessions: dict[str, list[dict]] = defaultdict(list)
    for e in interp:
        sessions[e.get("session", "?")].append(e)

    # 되묻기 복구율 — clarify 이후 같은 세션에서 update/confirm 이 나오면 복구로 본다
    clarify_total = clarify_recovered = 0
    for turns in sessions.values():
        for i, t in enumerate(turns):
            if t.get("action") == "clarify":
                clarify_total += 1
                if any(u.get("action") in ("update", "confirm") for u in turns[i + 1:]):
                    clarify_recovered += 1

    actions = Counter(e.get("action") for e in interp)
    providers = Counter(e.get("provider") for e in interp)
    sites = Counter(e.get("site") or "(미지정)" for e in events)
    fallbacks = sum(1 for e in interp if e.get("fallback"))
    errors = sum(1 for e in interp if e.get("error"))
    by_day = Counter(e["_kst"].strftime("%Y-%m-%d") for e in events)
    top_utt = Counter(e.get("utterance", "") for e in interp).most_common(10)

    stt_attempts = len(voice) + len(stt_failed)
    period = f"{events[0]['_kst']:%Y-%m-%d %H:%M} ~ {events[-1]['_kst']:%Y-%m-%d %H:%M} (KST)"

    lines = [
        "# 실증 로그 집계 리포트",
        "",
        f"- 로그: `{args.log}` / 기간: {period}",
        f"- 필터: 기간 {args.date_from or '전체'}~{args.date_to or '전체'}, "
        f"제외 {excluded}건 (발화 조건 {args.exclude_utterance or '없음'}, 세션 {args.exclude_session or '없음'})",
        f"- 이벤트 {len(events)}건 = 해석 발화 {len(interp)}건 + STT 실패 {len(stt_failed)}건 / 세션 {len(sessions)}개",
        "",
        "## 날짜별 건수 (KST)",
        *[f"- {d}: {n}건" for d, n in sorted(by_day.items())],
        "",
        "## 장소·팀원별 건수 (?site= 태그)",
        *[f"- {s}: {n}건" for s, n in sites.most_common()],
        "",
        "## 해석 결과",
        f"- 액션 분포: " + ", ".join(f"{a} {n}건" for a, n in actions.most_common()),
        f"- provider: " + ", ".join(f"{p} {n}건" for p, n in providers.most_common())
        + f" / 폴백 {fallbacks}건 ({pct(fallbacks, len(interp))}) / 해석 오류 {errors}건",
        f"- 되묻기(clarify) 복구율: {clarify_recovered}/{clarify_total} ({pct(clarify_recovered, clarify_total)})"
        + " — clarify 후 같은 세션에서 주문 진행(update/confirm)에 도달한 비율",
        "",
        "## STT",
        f"- 시도 {stt_attempts}건 중 성공 {len(voice)}건 ({pct(len(voice), stt_attempts)})",
        *[f"  - 실패 사유: {r} — {n}건" for r, n in Counter(e.get("error") for e in stt_failed).most_common()],
        "",
        "## 지연 시간",
        f"- 해석 발화 전체(latency_ms): {dist([e['latency_ms'] for e in interp if e.get('latency_ms')])}",
        f"- 음성 전체 파이프라인(STT+해석+TTS): {dist([e['latency_ms'] for e in voice if e.get('latency_ms')])}",
        f"  - STT: {dist([e['stt_ms'] for e in voice])}",
        f"  - 해석: {dist([e['interpret_ms'] for e in voice if e.get('interpret_ms')])}",
        f"  - TTS: {dist([e['tts_ms'] for e in voice if e.get('tts_ms')])}",
        "",
        "## 세션 요약",
        f"- 세션당 발화: {dist([len(t) for t in sessions.values()]).replace(' ms', '건').replace('ms', '건')}",
        f"- confirm(주문 확정) 도달 세션: {sum(1 for t in sessions.values() if any(e.get('action') == 'confirm' for e in t))}"
        f"/{len(sessions)}개 — 터치로 결제한 세션은 로그만으로 판정 불가하므로 기록지와 대조할 것",
        "",
        "## 최다 발화 (상위 10)",
        *[f"- {n}회: {u}" for u, n in top_utt],
        "",
        "> 주의: 동일 문장이 여러 번 반복되면 스모크 테스트일 수 있다. 참여자 데이터만 집계하려면",
        "> `--exclude-utterance`/`--exclude-session` 으로 제외하고, 과업 완료율·소요 시간은 기록지(08_실증키트)와 함께 본다.",
    ]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\n저장됨 → {args.out}")


if __name__ == "__main__":
    main()
