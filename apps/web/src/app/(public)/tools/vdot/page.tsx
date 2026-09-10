import type { Metadata } from 'next';
import { ToolPage } from '@/components/tools/tool-page';
import { VdotCalculator } from '@/components/tools/vdot-calculator';
import { findTool } from '@/lib/tools';

/**
 * VDOT 계산기 — PRD §13.1 `/tools/vdot`.
 *
 * 숫자는 전부 엔진(`packages/engine`)이 낸다. 이 페이지에도, 계산기에도 계수가 없다 —
 * 표의 상수를 옮겨 적지 않는 것이 ADR-0001 의 전제다.
 */

const tool = findTool('vdot')!;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'VDOT 계산기',
  description: tool.description,
  alternates: { canonical: '/tools/vdot' },
};

export default function VdotToolPage() {
  return (
    <ToolPage tool={tool}>
      <VdotCalculator />
    </ToolPage>
  );
}
