/**
 * Auth.js 콜백 엔드포인트. 이 리포에서 route handler 는 여기 하나뿐이다 —
 * 읽기는 서버 컴포넌트가, 쓰기는 Server Action 이 한다.
 *
 * Prisma 를 쓰므로 Node 런타임이어야 한다 (엣지에서는 동작하지 않는다).
 */

import { handlers } from '@/auth';

export const runtime = 'nodejs';
export const { GET, POST } = handlers;
