/**
 * UI 스크린샷 도구 — 각 화면을 헤드리스 크로미움으로 캡처한다.
 * 사용: node scripts/screenshot.mjs [outDir]
 * (백엔드 :8000, 프론트 :5173이 떠 있어야 한다)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "/tmp/kiosk-shots";
const BASE = process.env.KIOSK_URL ?? "http://localhost:5173";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 800, height: 1280 }, // 10.1" 세로 키오스크 비율
});

async function shot(name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}`);
}

await page.goto(`${BASE}/`);
await page.waitForLoadState("networkidle");
await shot("01-start");

// 매장 식사 → 주문 방식
await page.getByText("매장에서 먹고 가요").click();
await shot("02-order-mode");

// 화면 보고 주문 → 메뉴판
await page.getByText("화면 보고 주문하기").click();
await shot("03-menu-recommend");

// 세트 탭
await page.getByRole("button", { name: "세트", exact: true }).click();
await shot("04-menu-set");

// 햄버거 탭 → 단품 상세
await page.getByRole("button", { name: "햄버거", exact: true }).click();
await page.locator(".lk-card").first().click();
await shot("05-detail-burger");

// 담기 → 세트 업셀 모달
await page.getByText("담기").click();
await shot("06-upsell-modal");

// 세트로 변경 → 메뉴판(장바구니 채워짐)
await page.getByText("세트로 변경 (").click();
await shot("07-menu-with-cart");

// 결제 → 알레르기 확인 게이트
await page.getByText("결제하기").click();
await shot("08a-allergy-gate");

// "있어요" → 메뉴별 검토 화면
await page.getByText("있습니다 — 메뉴 확인").click();
await shot("08b-allergy-review");

// 계속 결제 → 주문 완료
await page.getByText("확인 완료 — 결제 진행").click();
await shot("08-complete");

// 처음으로 → 음성 주문 화면
await page.getByText("처음으로 (").click();
await page.getByText("매장에서 먹고 가요").click();
await page.getByText("말로 주문하기").click();
await page.waitForTimeout(1200);
await shot("09-voice");

// 텍스트 폴백으로 발화 → 음성 결과 화면 (헤드리스에는 마이크가 없음)
await page.locator(".lk-voice-fallback__input").fill("불고기버거 세트 하나랑 콜라 두 개 주세요");
await page.getByText("확인", { exact: true }).click();
await page.waitForTimeout(600);
await shot("10-voice-result");

// 추천 결과 화면
await page.locator(".lk-mic").click().catch(() => {});
await page.waitForTimeout(800);
await page.locator(".lk-voice-fallback__input").fill("매운 거 추천해줘").catch(() => {});
const ok = page.getByText("확인", { exact: true });
if (await ok.count()) {
  await ok.click();
  await page.waitForTimeout(600);
  await shot("11-voice-recommend");
}

// 낮은 화면 모드
await page.getByText("낮은 화면").click();
await shot("12-low-screen");
await page.getByText("낮은 화면").click();

// 큰 글씨 모드
await page.getByText("큰 글씨").click();
await shot("13-big-text");
await page.getByText("큰 글씨").click();

// 직원 호출
await page.getByText("직원 호출").click();
await shot("14-help-call");
await page.getByText("확인", { exact: true }).click();

// 대기(어트랙트) 화면 — 인체감지센서 대기 상태
await page.goto(`${BASE}/?attract=1`);
await page.waitForLoadState("networkidle");
await shot("15-attract");

await browser.close();
console.log(`저장 위치: ${OUT}`);
