# benchmark/

TORIAI の取り合い計算アルゴリズム v1 / v2 を比較計測・検証するための一式。

## 構成

| ファイル | 役割 |
| ---- | ---- |
| `loadToriai.js` | 本番と同じロード順で v1+v2 を Node の global に読み込む。`setMode('v1' or 'v2')` で切替。 |
| `testCases.js` | 再現可能なテストケース生成器（4プロファイル、seed 固定）。 |
| `runBench.js` | v1/v2 を切替えて calcCore() を流し、CSV 出力。 |
| `verifyCompat.js` | k ≤ 13 で v1 と v2 が完全一致するかを検証（CI用、終了コード 0/1）。 |
| `verifyPatternC.js` | Pattern C（A も B も無い時の 80% 未満 repeat 最大）の仕様検証。 |

## 前提

- Node.js 18 以上（v22 で動作確認）
- 追加の npm パッケージ不要

## 使い方

```bash
# k≤13 で v1 と v2 の結果が完全一致するか検証
node benchmark/verifyCompat.js
node benchmark/verifyCompat.js --max-k 13

# 動作確認用の小さなベンチ
node benchmark/runBench.js calibration

# v1/v2 境界（k=11..15）の比較
node benchmark/runBench.js boundary --csv out_boundary.csv

# v2 単独でヘビーケース（メモリ広めに）
node --max-old-space-size=4096 benchmark/runBench.js heavy --only v2

# Pattern C 検証
node benchmark/verifyPatternC.js
```

## 出力フォーマット（CSV）

```
profile,distribution,k,n,uniqueLens,seed,version,ms,lossRate,bars,type,error
```

- `profile` : `uniform | realistic | stressful | manyShort`
- `version` : `v1 | v2`
- `ms`      : calcCore() 一回の実時間（ms）
- `lossRate`: yieldCard1.lossRate（%）
- `bars`    : yieldCard1.bars.length
- `type`    : `bnb | single`

## マトリクス

| 引数 | 範囲 | 用途 |
| ---- | ---- | ---- |
| `calibration` | k=5,8,10,12,13 / n=40,100 | 動作確認・素早く |
| `boundary`    | k=11..15 / n=60,120 | v1/v2 切替境界の互換性 |
| `normal`      | k=10..30 / n=80,150,200 | 通常モード狙い |
| `heavy`       | k=30..50 / n=200..500 | より大きい問題 |
| `stress`      | k=40..80 / n=300,600 | 落ちる境界探し |

## CI

`.github/workflows/test.yml` で push/PR 時に：

1. `verifyPatternC.js` 実行
2. 合成データ k=10/20/30 の完走テスト
3. k≤13 で v1 == v2 のスポットチェック

すべて pass しないと GitHub Pages デプロイは走らない。
