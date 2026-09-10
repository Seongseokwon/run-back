import type { Metadata } from 'next';
import { PaceCalculator } from '@/components/tools/pace-calculator';
import { ToolPage } from '@/components/tools/tool-page';
import { findTool } from '@/lib/tools';

/**
 * 페이스 계산기 — PRD §13.1 `/tools/pace`.
 *
 * 껍데기는 정적이고 계산기만 클라이언트다. 검색 엔진이 읽는 글(질문·직답·FAQ)은
 * 전부 HTML 에 들어 있어야 하므로 계산 결과에 기대지 않는다.
 */

const tool = findTool('pace')!;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '러닝 페이스 계산기',
  description: tool.description,
  alternates: { canonical: '/tools/pace' },
};

export default function PaceToolPage() {
  return (
    <ToolPage tool={tool}>
      <PaceCalculator />
    </ToolPage>
  );
}
