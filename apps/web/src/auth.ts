/**
 * 인증 (F-16) — 카카오 단독. PRD §9.3
 *
 * 지켜야 할 선 셋:
 *
 * 1. **회원번호만 받는다.** 카카오 기본 provider 의 profile() 은 닉네임·이메일·프로필
 *    이미지까지 매핑하는데, §9.4 는 그 셋을 전부 미수집으로 정해 뒀다. 그래서 덮어쓴다.
 *    이건 취향이 아니라 §9.3 의 근거다 — "카카오 로그인 단독 + 회원번호만 수집"이라
 *    비즈앱 심사 대상이 아니고, 그 덕에 사업자등록 없이 서비스를 연다.
 *    scope 를 비워 두는 것(provider 기본값 `?scope`)도 같은 이유다.
 *
 * 2. **원본 식별자를 저장하지 않는다.** 카카오 회원번호는 해시해서 넣는다 (§9.8).
 *    토큰에 남는 것도 우리 내부 id 지 카카오 번호가 아니다.
 *
 * 3. **라우트를 막지 않는다.** 이 파일은 proxy.ts(구 middleware)를 만들지 않는다.
 *    공개 경로와 플랜 결과는 크롤러가 도달해야 하고(§13), 로그인은 '생성'이 아니라
 *    '저장' 시점에만 요구한다(§9.2). 보호 대상은 페이지가 아니라 동작이다.
 */

import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Credentials from 'next-auth/providers/credentials';
import Kakao from 'next-auth/providers/kakao';
import { upsertUserOnLogin, verifyPasswordLogin } from '@runback/db';

/**
 * 이메일 + 비밀번호 로그인을 켤지. **명시적 opt-in 이다.**
 *
 * 환경으로 자동 판단하지 않는다 — "개발이니까 켜진다"는 규칙은 스테이징·프리뷰처럼
 * 애매한 환경에서 예측이 안 된다. 켜려면 어디서든 이 값을 직접 적어야 한다.
 *
 * ⚠️ 프로덕션에서 켤 거라면 개인정보처리방침의 처리 항목에 이메일이 들어가야 한다.
 * 지금 방침 제3항은 이메일을 '수집하지 않는 항목'으로 적어 두고 있다 (§9.4).
 * 플래그만 켜고 방침을 그대로 두면 그게 곧 위반이다.
 */
const PASSWORD_LOGIN_ENABLED = process.env.AUTH_PASSWORD_LOGIN === 'true';

declare module 'next-auth' {
  interface Session {
    user: {
      /** RUNBACK 내부 사용자 id. 카카오 회원번호가 아니다 */
      id: string;
      /** 수집하지 않으므로(§9.4) 대개 null 이다 */
      nickname: string | null;
    } & DefaultSession['user'];
    /** 탈퇴 시 연동 해제에만 쓴다. DB 에 저장하지 않는다 — auth.ts 의 jwt 콜백 주석 참조 */
    kakaoAccessToken?: string;
  }
}

const providers: Provider[] = [
  Kakao({
    // 회원번호만. 닉네임·이메일·프로필 이미지는 받지 않는다 (§9.4)
    profile: (profile: { id: number | string }) => ({ id: String(profile.id) }),
  }),
];

if (PASSWORD_LOGIN_ENABLED) {
  providers.push(
    Credentials({
      id: 'password',
      name: '이메일',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      /**
       * 실패 이유를 구분해서 돌려주지 않는다. '없는 계정'과 '틀린 비밀번호'를 나누는 순간
       * 가입 여부가 새어 나간다. 잠금·타이밍 방어는 저장소 쪽(verifyPasswordLogin)에 있다.
       */
      async authorize(raw) {
        const email = typeof raw?.email === 'string' ? raw.email : '';
        const password = typeof raw?.password === 'string' ? raw.password : '';
        const user = await verifyPasswordLogin({ email, password });
        // authorize 가 돌려주는 id 는 **이미 우리 내부 id** 다 (카카오처럼 변환할 게 없다)
        return user ? { id: user.id, nickname: user.nickname } : null;
      },
    }),
  );
}

export const authConfig = {
  providers,

  // DB 세션이 아니라 JWT 쿠키 (§9.8). httpOnly·secure·sameSite=lax 는 Auth.js 기본값이다
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },

  callbacks: {
    /**
     * 처음 로그인할 때만 account 가 온다. 그때 계정을 만들거나 찾아서
     * **우리 내부 id** 를 토큰에 심는다. 이후 요청은 토큰만 읽는다.
     */
    async jwt({ token, account, user }) {
      if (account?.provider === 'kakao' && account.providerAccountId) {
        const record = await upsertUserOnLogin({
          provider: 'kakao',
          providerUserId: account.providerAccountId,
        });
        token.userId = record.id;
        token.nickname = record.nickname;

        /*
         * 탈퇴 시 카카오 연동 해제(§9.6)에 쓰려고 액세스 토큰을 **세션 쿠키에만** 둔다.
         * DB 에 넣지 않는 이유: 저장하는 순간 유출 대상이 하나 늘어난다.
         *
         * 한계를 알고 쓴다 — 카카오 액세스 토큰은 몇 시간이면 만료되는데 세션은 30일이라
         * 대부분의 탈퇴 시점엔 이미 죽어 있다. 그래서 연동 해제는 **best-effort** 이고,
         * 실패해도 데이터 삭제는 그대로 진행한다 (아래 unlinkKakao 주석 참조).
         */
        if (typeof account.access_token === 'string') {
          token.kakaoAccessToken = account.access_token;
        }
      } else if (account?.provider === 'password' && user?.id) {
        // authorize 가 검증을 끝냈다. 여기서 다시 DB 를 보지 않는다
        token.userId = user.id;
        token.nickname = 'nickname' in user ? ((user as { nickname: string | null }).nickname) : null;
      }
      return token;
    },

    async session({ session, token }) {
      if (typeof token.kakaoAccessToken === 'string') {
        session.kakaoAccessToken = token.kakaoAccessToken;
      }
      session.user = {
        ...session.user,
        id: typeof token.userId === 'string' ? token.userId : '',
        nickname: typeof token.nickname === 'string' ? token.nickname : null,
      };
      return session;
    },
  },

  /*
   * 전용 로그인 화면. 한때 '나' 탭이 이걸 겸했는데 두 가지가 어긋났다 —
   * 설정 목록 한가운데 로그인 폼이 끼어 무엇이 주 경로인지 안 읽혔고,
   * 저장 버튼에서 넘어온 callbackUrl 을 받아 줄 자리가 없어 **로그인 뒤 플랜이 사라졌다**.
   */
  pages: { signIn: '/login' },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
