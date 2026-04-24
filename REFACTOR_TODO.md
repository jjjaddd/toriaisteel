# TORIAI Refactor TODO

見た目を壊さず、段階的に `data` 中心の構成へ移すための TODO です。

## Phase 1: 土台づくり
- [x] `src/` 配下に責務別ディレクトリを追加
- [x] 共通 namespace を追加
- [x] `storage` の共通 key / localStore を追加
- [x] `services` の公開設定入口を追加
- [x] 鋼種ごとの `stockLengths.js` を追加
- [x] `calculation/weight` の純関数を追加

## Phase 2: data / storage の移行
- [x] 既存コードから新 `stockLengths` レイヤーを参照できるようにする
- [ ] `SECTION_DATA` を鋼種ごとの `specs.js` へ分割する
- [ ] `data/steel/index` で鋼種・規格参照を一元化する
- [ ] 重量タブの保存口を `storage/weight-store` に集約する
- [ ] 在庫・履歴の保存口を repository 経由へ寄せる

## Phase 3: calculation の分離
- [ ] `calc.js` の `STEEL` 巨大定義を data 側へ移動する
- [ ] 取り合い計算を `calculation/yield` と `calculation/pattern` に分割する
- [ ] 断面性能計算を `calculation/section` へ切り出す
- [ ] 塗装面積計算を `calculation/paint` へ切り出す

## Phase 4: UI と security
- [ ] `innerHTML` 多用箇所を優先順で無害化する
- [ ] 入力バリデーションを `utils/validation` 経由へ寄せる
- [ ] `final-overrides.js` の責務を用途別に分割する
- [ ] localStorage の直書きを整理し、将来の Supabase 入口を固定する

## Phase 5: 将来拡張の準備
- [ ] `auth` にログイン状態モデルを追加する
- [ ] `inventory` に事業所単位のデータ境界を持たせる
- [ ] `services/supabase` へ接続実装を段階移行する
