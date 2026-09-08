import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysUntil,
  errorsOnly,
  findRace,
  races,
  racesWithDistance,
  searchRaces,
  seoReadyRaces,
  upcomingRaces,
  validateRaces,
  STANDARD_DISTANCES_KM,
  type Race,
} from '../src/index.ts';

/** 데이터를 큐레이션한 날. 신선도 경고 기준점 */
const CURATED_ON = '2026-09-07';

describe('데이터 무결성', () => {
  test('스키마 오류가 하나도 없다', () => {
    const errors = errorsOnly(validateRaces(races, CURATED_ON));
    assert.deepEqual(
      errors.map((e) => `${e.slug}.${e.field}: ${e.message}`),
      [],
    );
  });

  test('slug 이 유일하다', () => {
    assert.equal(new Set(races.map((r) => r.slug)).size, races.length);
  });

  test('날짜 오름차순으로 정렬돼 있다', () => {
    for (let i = 1; i < races.length; i++) {
      assert.ok(races[i - 1]!.date <= races[i]!.date, `${races[i - 1]!.slug} → ${races[i]!.slug}`);
    }
  });

  test('모든 대회가 표준 종목을 하나 이상 운영한다', () => {
    for (const r of races) {
      const std = r.distances.filter((d) => (STANDARD_DISTANCES_KM as readonly number[]).includes(d));
      assert.ok(std.length > 0, `${r.slug}: ${r.distances.join(',')}`);
      assert.ok(r.distances.length >= 2, `${r.slug} 는 2종목 미만이다`);
    }
  });

  test('모든 대회에 출처 URL과 최종 확인일이 있다 (§12 운영 원칙)', () => {
    for (const r of races) {
      assert.match(r.sourceUrl, /^https?:\/\//, r.slug);
      assert.match(r.updatedAt, /^\d{4}-\d{2}-\d{2}$/, r.slug);
    }
  });

  test('개최가 불투명한 대회는 설명을 함께 갖는다', () => {
    for (const r of races.filter((x) => x.status === 'uncertain')) {
      assert.ok(r.statusNote && r.statusNote.length > 10, r.slug);
    }
  });
});

describe('검증기 자체 검사', () => {
  const base: Race = {
    slug: 'test-race-2026',
    nameKo: '테스트 대회',
    date: '2026-12-01',
    region: '서울',
    distances: [5, 10],
    status: 'scheduled',
    confidence: 'high',
    sourceUrl: 'https://example.com',
    updatedAt: CURATED_ON,
  };
  const errorsFor = (over: Partial<Race>): string[] =>
    errorsOnly(validateRaces([{ ...base, ...over }], CURATED_ON)).map((e) => e.field);

  test('정상 데이터는 통과한다', () => {
    assert.deepEqual(errorsFor({}), []);
  });

  test('잘못된 slug 을 잡는다', () => {
    assert.ok(errorsFor({ slug: 'Test_Race' }).includes('slug'));
  });

  test('존재하지 않는 날짜를 잡는다', () => {
    assert.ok(errorsFor({ date: '2026-02-30' }).includes('date'));
    assert.ok(errorsFor({ date: '2026-13-01' }).includes('date'));
  });

  test('단일 종목 대회를 잡는다', () => {
    assert.ok(errorsFor({ distances: [10] }).includes('distances'));
  });

  test('표준 종목이 없는 대회를 잡는다', () => {
    assert.ok(errorsFor({ distances: [8, 16] }).includes('distances'));
  });

  test('거리 정렬이 어긋난 것을 잡는다', () => {
    assert.ok(errorsFor({ distances: [10, 5] }).includes('distances'));
  });

  test('출처 없는 데이터를 잡는다', () => {
    assert.ok(errorsFor({ sourceUrl: '' }).includes('sourceUrl'));
  });

  test('중복 slug 을 잡는다', () => {
    const dup = errorsOnly(validateRaces([base, { ...base, nameKo: '다른 대회' }], CURATED_ON));
    assert.ok(dup.some((e) => e.field === 'slug'));
  });

  test('설명 없는 uncertain 을 잡는다', () => {
    assert.ok(errorsFor({ status: 'uncertain' }).includes('statusNote'));
  });

  test('지난 대회와 미점검 데이터를 경고한다', () => {
    const warns = validateRaces([{ ...base, date: '2026-01-01', updatedAt: '2025-01-01' }], CURATED_ON)
      .filter((i) => i.level === 'warn')
      .map((i) => i.field);
    assert.ok(warns.includes('date'));
    assert.ok(warns.includes('updatedAt'));
  });
});

describe('조회 함수', () => {
  test('upcomingRaces 는 지난 대회를 걸러낸다', () => {
    const later = upcomingRaces('2026-11-01');
    assert.ok(later.every((r) => r.date >= '2026-11-01'));
    assert.ok(later.length < races.length);
  });

  test('seoReadyRaces 는 차별화 콘텐츠가 있는 대회만 낸다 (§13.2)', () => {
    const ready = seoReadyRaces(CURATED_ON);
    assert.ok(ready.length > 0);
    for (const r of ready) assert.ok(r.courseNote || r.weatherNote, r.slug);
    assert.ok(ready.length < upcomingRaces(CURATED_ON).length, '전부 준비됐다면 필터가 무의미하다');
  });

  test('SEO 페이지 수가 §13.2 상한(100개) 안에 있다', () => {
    assert.ok(seoReadyRaces(CURATED_ON).length <= 100);
  });

  test('종목별 조회', () => {
    const full = racesWithDistance(42.195, CURATED_ON);
    assert.ok(full.length > 0);
    for (const r of full) assert.ok(r.distances.includes(42.195));
  });

  test('대회명과 지역으로 검색된다', () => {
    assert.ok(searchRaces('춘천', CURATED_ON).some((r) => r.nameKo.includes('춘천마라톤')));
    assert.ok(searchRaces('제주', CURATED_ON).length > 0);
    assert.equal(searchRaces('존재하지않는대회명', CURATED_ON).length, 0);
    assert.ok(searchRaces('', CURATED_ON, 3).length <= 3);
  });

  test('findRace 와 daysUntil', () => {
    const chuncheon = findRace('chuncheon-marathon-2026');
    assert.ok(chuncheon);
    assert.equal(chuncheon!.date, '2026-10-25');
    assert.equal(daysUntil(chuncheon!, '2026-10-18'), 7);
    assert.equal(findRace('없는-대회'), undefined);
  });
});
