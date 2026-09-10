# 목업

작성자가 그린 **화면 목업**을 두는 곳. 참고 자료지 배포 자산이 아니다.

실제로 서비스에 나가는 그림은 여기가 아니라 `apps/web/public/illustrations/` 에 있고,
`apps/web/src/lib/illustrations.ts` 가 슬롯에 물린다. 둘을 헷갈리지 말 것.

| 어디 | 무엇 | 커밋 |
|---|---|---|
| `docs/mockups/runback-*.png` | 화면 목업 6장. **화면 구성의 기준** | ✅ |
| `apps/web/public/illustrations/scene-female-*.webp` | 세션 씬 아트워크 (여성) 10장 | ✅ |
| `apps/web/public/illustrations/scene-male-*.webp` | 세션 씬 아트워크 (남성) 10장 | ✅ |

**두 벌 다 리포에 둔다.** 한쪽만 남기면 나중에 성별 선택이 붙을 때 그림을 다시 만들어야 한다.
지금 어느 벌을 쓸지는 `apps/web/src/lib/illustrations.ts` 의 `SCENE_SET` 상수 하나가 정한다 —
화면 코드는 파일 이름을 모른다. 러너의 성별에 맞춰 자동으로 고르려면 성별을 알아야 하는데
PRD §9.4 가 미수집으로 정해 뒀다 (O13 미결).

세션 씬 원본이 한때 이 폴더에도 복사돼 있었지만 `public/` 과 바이트까지 같은 중복이라 지웠다.
**그림을 고치거나 추가하려면 `public/illustrations/` 쪽을 고친다.**

## 화면 목업 파일 이름 = 라우트

이름만 보고 어느 화면인지 알 수 있게 라우트를 그대로 쓴다. 슬래시는 하이픈으로 바꾼다.

| 파일 | 화면 |
|---|---|
| `runback-landing-balanced.png` | `/today` |
| `runback-race-tab.png` | `/races` |
| `runback-training-detail.png` | `/races/[slug]` 훈련 일정 상세 |
| `runback-records-tab.png` | `/log` |
| `runback-profile-tab.png` | `/me` |

새로 추가할 때도 같은 규칙을 쓴다 — `plan-new.png`, `plan-verdict.png`, `plan-result.png`.
한 화면에 상태가 여러 개면 뒤에 붙이고(`today-rest.png`), 아직 라우트가 없는 아이디어 화면이면
`idea-` 를 앞에 붙인다.

PNG · JPG · PDF 를 읽을 수 있다. 모바일 우선이므로 **375px 폭 기준**이면 가장 정확하다.

## ⚠️ 용량

세션 씬 원본이 2304×1536 / 장당 4~5MB PNG 라 두 벌 합쳐 `public/illustrations/` 가 90MB 다.
`next/image` 가 요청 크기로 줄이고 WebP/AVIF 로 내보내므로 **사용자가 받는 용량은 문제없지만**,
리포 무게와 첫 요청의 최적화 지연은 남는다.

앱에서 쓰는 최대 폭은 448px(`max-w-md`)이다. **1200px 폭으로 다시 내보내면 장당 ~200KB**,
두 벌 20장을 합쳐도 4MB 정도가 된다. 화질 손해는 없다. 한 번 커밋하면 히스토리에 남아 나중에 줄여도
클론 용량은 안 줄어드니, 줄이려면 커밋 전이 낫다 (CLAUDE.md §9 O18).

## 목업과 코드가 어긋날 때

목업이 자동으로 이기지 않는다. PRD 가 상위 문서고(CLAUDE.md §0-2),
목업이 PRD·접근성 기준과 부딪히면 그대로 옮기지 말고 짚고 넘어간다.
실제로 그렇게 뺀 것들이 있다 — CLAUDE.md §8 '의도적으로 안 만든 것' 표.
