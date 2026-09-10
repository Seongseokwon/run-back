-- 활성 계정의 소셜 식별자만 유니크로 묶는다.
--
-- 전역 유니크로 걸면 안 되는 이유: 탈퇴가 soft delete(15일)라 탈퇴 행이 그대로 남아 있고,
-- 그 사람이 15일 안에 같은 카카오 계정으로 재가입하면 제약에 걸려 **가입 자체가 막힌다.**
-- 탈퇴한 사람의 재가입을 막는 것은 우리가 의도한 정책이 아니다 (재가입 = 새 계정).
--
-- Prisma 스키마 문법에 부분 인덱스(WHERE 절)가 없어서 SQL 로 직접 넣는다.
-- schema.prisma 의 User.providerUserIdHash 주석과 세트로 읽을 것.
CREATE UNIQUE INDEX "users_active_provider_identity_key"
  ON "users" ("provider", "providerUserIdHash")
  WHERE "deletedAt" IS NULL;
