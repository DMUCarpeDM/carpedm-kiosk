"""표현 사전 무결성 검사 — 표현이 서로 헷갈리지 않는지 자동 확인한다.

검사 항목:
1. 같은 표현(공백 제거 기준)이 두 매핑에 중복 등록되면 오류
2. 표현이 '다른 메뉴'의 정식 이름과 정확히 같으면 오류 (엉뚱한 메뉴로 매핑됨)
3. 모든 id가 menu.json에 존재해야 함
4. 한 글자 표현은 화이트리스트("물", "콘", "윙")만 허용 (오인식 위험)
5. (정보) 다른 매핑의 표현을 부분 문자열로 포함하는 경우 — 긴 구절 우선 규칙으로
   안전하지만 참고용으로 출력

사용: python scripts/check_expressions.py  (문제 있으면 종료코드 1)
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.interpreter import load_expressions, load_menu  # noqa: E402

SINGLE_CHAR_ALLOW = {"물", "콘", "윙", "닭"}


def _norm(s: str) -> str:
    return s.replace(" ", "")


def check(menu: dict[str, dict], expressions: dict) -> list[str]:
    errors: list[str] = []
    mappings = expressions.get("mappings", [])

    # 메뉴 이름 → id (정식 이름 충돌 검사용)
    name_to_id: dict[str, str] = {}
    for m in menu.values():
        for nm in (m.get("easy_name"), m.get("original_name")):
            if nm:
                name_to_id[_norm(nm)] = m["id"]

    seen: dict[str, tuple[int, list[str]]] = {}
    for i, mp in enumerate(mappings):
        ids = mp.get("ids", [])
        for mid in ids:
            if mid not in menu:
                errors.append(f"[없는 id] 매핑 {i}: {mid!r}")
        for ph in mp.get("phrases", []):
            np = _norm(ph)
            if not np:
                errors.append(f"[빈 표현] 매핑 {i}")
                continue
            if len(np) == 1 and np not in SINGLE_CHAR_ALLOW:
                errors.append(f"[한 글자 표현] {ph!r} — 오인식 위험 (허용 목록에 없음)")
            if np in seen and seen[np][1] != ids:
                errors.append(
                    f"[중복 표현] {ph!r} 이 매핑 {seen[np][0]}({seen[np][1]})과 매핑 {i}({ids})에 모두 등록됨"
                )
            seen.setdefault(np, (i, ids))
            # 다른 메뉴의 정식 이름과 동일한 표현 금지
            owner = name_to_id.get(np)
            if owner and owner not in ids:
                errors.append(f"[이름 충돌] 표현 {ph!r} 은 메뉴 {owner!r}의 정식 이름인데 {ids}로 매핑됨")
    return errors


def main() -> int:
    menu = load_menu()
    expressions = load_expressions()
    errors = check(menu, expressions)
    n_phrases = sum(len(mp.get("phrases", [])) for mp in expressions.get("mappings", []))
    print(f"표현 {n_phrases}개 / 매핑 {len(expressions.get('mappings', []))}건 검사")
    if errors:
        print(f"\n문제 {len(errors)}건:")
        for e in errors:
            print(f"  ✗ {e}")
        return 1
    print("✓ 충돌 없음")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
