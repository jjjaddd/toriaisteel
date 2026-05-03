/**
 * tests/arcflow/graph.test.js
 *
 * Phase 2 day-2: Compact Arc-Flow グラフ構築の検証。
 *
 * 検証項目:
 *   - validateSpec: 入力バリデーション
 *   - buildArcFlowGraph: 単純ケース・BUG-V2-001 micro・multi-piece
 *   - reachable position の正確性
 *   - item arc / loss arc の構造
 *   - グラフサイズが想定通りに小さい
 */

const graph = require('../../src/calculation/yield/arcflow/graph.js');

describe('arcflow/graph — Compact Arc-Flow グラフ構築', () => {
  // -------------------------------------------------------------------------
  // バリデーション
  // -------------------------------------------------------------------------
  describe('validateSpec', () => {
    test('rejects null / non-object', () => {
      expect(() => graph.buildArcFlowGraph(null)).toThrow();
      expect(() => graph.buildArcFlowGraph('oops')).toThrow();
    });

    test('rejects bad stock / blade / endLoss', () => {
      const base = { blade: 3, endLoss: 150, pieces: [{ length: 1222, count: 6 }] };
      expect(() => graph.buildArcFlowGraph(Object.assign({}, base, { stock: 0 }))).toThrow();
      expect(() => graph.buildArcFlowGraph(Object.assign({}, base, { stock: -10 }))).toThrow();
      expect(() => graph.buildArcFlowGraph(Object.assign({}, base, { stock: 10000, blade: -1 }))).toThrow();
      expect(() => graph.buildArcFlowGraph(Object.assign({}, base, { stock: 10000, endLoss: -1 }))).toThrow();
    });

    test('rejects when effective length non-positive', () => {
      expect(() => graph.buildArcFlowGraph({
        stock: 100, blade: 0, endLoss: 100, pieces: [{ length: 50, count: 1 }]
      })).toThrow(/effective/);
    });

    test('rejects empty pieces array', () => {
      expect(() => graph.buildArcFlowGraph({
        stock: 10000, blade: 3, endLoss: 150, pieces: []
      })).toThrow();
    });

    test('rejects piece longer than effective stock', () => {
      expect(() => graph.buildArcFlowGraph({
        stock: 10000, blade: 3, endLoss: 150, pieces: [{ length: 9851, count: 1 }]
      })).toThrow(/exceeds/);
    });

    test('rejects piece with non-positive length / count', () => {
      const stock10m = { stock: 10000, blade: 3, endLoss: 150 };
      expect(() => graph.buildArcFlowGraph(Object.assign({}, stock10m, { pieces: [{ length: 0, count: 1 }] }))).toThrow();
      expect(() => graph.buildArcFlowGraph(Object.assign({}, stock10m, { pieces: [{ length: 1222, count: 0 }] }))).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 内部 helper: computeReachablePositions
  // -------------------------------------------------------------------------
  describe('_computeReachablePositions', () => {
    test('単一 item: 0, w, 2w, ..., maxPerBar*w', () => {
      const items = [{ weight: 1225, maxPerBar: 6 }];
      const reachable = graph._computeReachablePositions(items, 9853);
      expect([...reachable].sort((a, b) => a - b)).toEqual([0, 1225, 2450, 3675, 4900, 6125, 7350]);
    });

    test('単一 item, capacity が maxPerBar より厳しい場合', () => {
      const items = [{ weight: 1225, maxPerBar: 3 }]; // maxPerBar が capacity 制約より小さい
      const reachable = graph._computeReachablePositions(items, 9853);
      expect([...reachable].sort((a, b) => a - b)).toEqual([0, 1225, 2450, 3675]);
    });

    test('2 item の組合せ', () => {
      // weight 100 (max 3) と weight 200 (max 2) を ext capacity 1000 で
      const items = [
        { weight: 100, maxPerBar: 3 },
        { weight: 200, maxPerBar: 2 }
      ];
      const r = [...graph._computeReachablePositions(items, 1000)].sort((a, b) => a - b);
      // i=0,1,2,3 と j=0,1,2 の組合せ × は a + b の値
      // (0,0)=0, (1,0)=100, (2,0)=200, (3,0)=300
      // (0,1)=200, (1,1)=300, (2,1)=400, (3,1)=500
      // (0,2)=400, (1,2)=500, (2,2)=600, (3,2)=700
      expect(r).toEqual([0, 100, 200, 300, 400, 500, 600, 700]);
    });
  });

  // -------------------------------------------------------------------------
  // BUG-V2-001 micro: 1222 × 6 in 10m bar
  // -------------------------------------------------------------------------
  describe('BUG-V2-001 micro: 1222 × 6 in 10m', () => {
    let g;
    beforeAll(() => {
      g = graph.buildArcFlowGraph({
        stock: 10000,
        blade: 3,
        endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
    });

    test('capacity / extCapacity / sink', () => {
      expect(g.capacity).toBe(9850);
      expect(g.extCapacity).toBe(9853); // W + blade
      expect(g.sink).toBe(9853);
    });

    test('items.maxPerBar = min(demand=6, floor(9853/1225)=8) = 6', () => {
      expect(g.items[0].weight).toBe(1225);
      expect(g.items[0].maxPerBar).toBe(6);
    });

    test('nodes = [0, 1225, 2450, ..., 7350, 9853]', () => {
      expect([...g.nodes]).toEqual([0, 1225, 2450, 3675, 4900, 6125, 7350, 9853]);
    });

    test('item arcs: 6 連続', () => {
      // 0→1225, 1225→2450, ..., 6125→7350 の 6 本
      expect(g.itemArcs).toHaveLength(6);
      g.itemArcs.forEach(function(a, i) {
        expect(a.from).toBe(i * 1225);
        expect(a.to).toBe((i + 1) * 1225);
        expect(a.itemIndex).toBe(0);
        expect(a.itemLength).toBe(1222);
      });
    });

    test('loss arcs: 全 reachable から sink へ（sink 自身を除く）= 7 本', () => {
      // [0, 1225, 2450, 3675, 4900, 6125, 7350] の 7 個から sink(9853) へ
      expect(g.lossArcs).toHaveLength(7);
      g.lossArcs.forEach(function(a) {
        expect(a.to).toBe(9853);
        expect(a.from).toBeLessThan(9853);
      });
    });

    test('stats が一貫', () => {
      expect(g.stats.nodeCount).toBe(8);
      expect(g.stats.itemArcCount).toBe(6);
      expect(g.stats.lossArcCount).toBe(7);
    });
  });

  // -------------------------------------------------------------------------
  // 同じ pieces を 9m bar に乗せる: maxPerBar 同じ、loss 違う
  // -------------------------------------------------------------------------
  describe('1222 × 6 in 9m bar', () => {
    let g;
    beforeAll(() => {
      g = graph.buildArcFlowGraph({
        stock: 9000,
        blade: 3,
        endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
    });

    test('extCapacity = 9000 - 150 + 3 = 8853', () => {
      expect(g.extCapacity).toBe(8853);
    });

    test('maxPerBar = min(6, floor(8853/1225)=7) = 6', () => {
      expect(g.items[0].maxPerBar).toBe(6);
    });

    test('nodes と item arcs は 10m と同じ構造', () => {
      // 0..7350 と sink(8853)
      expect([...g.nodes]).toEqual([0, 1225, 2450, 3675, 4900, 6125, 7350, 8853]);
      expect(g.itemArcs).toHaveLength(6);
    });
  });

  // -------------------------------------------------------------------------
  // 8m bar: maxPerBar = 6, sink = 7853, ぴったり 1 つ余り
  // -------------------------------------------------------------------------
  describe('1222 × 6 in 8m bar (BUG-V2-001 optimal)', () => {
    let g;
    beforeAll(() => {
      g = graph.buildArcFlowGraph({
        stock: 8000,
        blade: 3,
        endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
    });

    test('extCapacity = 8000 - 150 + 3 = 7853', () => {
      expect(g.extCapacity).toBe(7853);
    });

    test('maxPerBar = min(6, floor(7853/1225)=6) = 6', () => {
      expect(g.items[0].maxPerBar).toBe(6);
    });

    test('全 6 ピース乗る (7350 ≤ 7853)', () => {
      expect(g.nodes).toContain(7350);
      // sink = 7853, 7853 - 7350 = 503 が想定 loss
    });
  });

  // -------------------------------------------------------------------------
  // multi-piece: 複数長
  // -------------------------------------------------------------------------
  describe('multi-piece: 1222 × 4 + 800 × 3 in 10m', () => {
    let g;
    beforeAll(() => {
      g = graph.buildArcFlowGraph({
        stock: 10000,
        blade: 3,
        endLoss: 150,
        pieces: [
          { length: 1222, count: 4 },
          { length: 800,  count: 3 }
        ]
      });
    });

    test('items 2 種、各 maxPerBar が demand 上限', () => {
      expect(g.items).toHaveLength(2);
      expect(g.items[0].maxPerBar).toBe(4);
      expect(g.items[1].maxPerBar).toBe(3);
    });

    test('item arcs に両 piece type が含まれる', () => {
      const types = new Set(g.itemArcs.map(function(a) { return a.itemIndex; }));
      expect(types).toEqual(new Set([0, 1]));
    });

    test('node 0 から両 item arc が出る', () => {
      const fromZero = g.itemArcs.filter(function(a) { return a.from === 0; });
      expect(fromZero.length).toBe(2);
      expect(new Set(fromZero.map(function(a) { return a.itemIndex; }))).toEqual(new Set([0, 1]));
    });

    test('全ノード から sink への loss arc が 1 本ずつ', () => {
      const fromsLoss = g.lossArcs.map(function(a) { return a.from; });
      expect(new Set(fromsLoss).size).toBe(fromsLoss.length); // 重複なし
      expect(g.lossArcs.length).toBe(g.nodes.length - 1);     // sink 除く
    });
  });

  // -------------------------------------------------------------------------
  // 不変性
  // -------------------------------------------------------------------------
  describe('不変性 (frozen)', () => {
    test('返り値とその子配列が frozen', () => {
      const g = graph.buildArcFlowGraph({
        stock: 10000, blade: 3, endLoss: 150,
        pieces: [{ length: 1222, count: 6 }]
      });
      expect(Object.isFrozen(g)).toBe(true);
      expect(Object.isFrozen(g.nodes)).toBe(true);
      expect(Object.isFrozen(g.itemArcs)).toBe(true);
      expect(Object.isFrozen(g.lossArcs)).toBe(true);
      expect(Object.isFrozen(g.items)).toBe(true);
      expect(Object.isFrozen(g.stats)).toBe(true);
      expect(Object.isFrozen(g.spec)).toBe(true);
      expect(Object.isFrozen(g.spec.pieces)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // グラフサイズが現実的か（実データ規模のスモーク）
  // -------------------------------------------------------------------------
  describe('スケール感確認', () => {
    test('CASE-2 L20 の 1 部材長セット (k=5) でも数百ノード以内に収まる', () => {
      const g = graph.buildArcFlowGraph({
        stock: 12000,
        blade: 3,
        endLoss: 150,
        pieces: [
          { length: 1750, count: 4 },
          { length: 1825, count: 50 },
          { length: 1830, count: 60 },
          { length: 1992, count: 18 },
          { length: 2806, count: 60 }
        ]
      });
      // grow exponentially 警戒。実用域で対処可能なサイズに収まることを確認
      expect(g.stats.nodeCount).toBeLessThan(5000);
      expect(g.stats.itemArcCount).toBeLessThan(20000);
    });
  });
});
