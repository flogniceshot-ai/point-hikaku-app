import { searchCampaigns } from "../lib/db";
import SearchHome from "./components/SearchHome";

export const revalidate = 3600; // 1時間ごとに再生成(日付が変わったら新しい並びに)

// 円換算した還元額(rate案件はそのまま%)。カテゴリページと同じロジック。
function bestYenValue(campaign) {
  const offers = campaign.offers || [];
  if (offers.length === 0) return -1;
  const top = offers[0];
  if (campaign.rewardType === "rate") return top.value;
  return top.value * (top.pointRate ?? 1);
}

// 日付を種にした簡易LCG。同じ日なら誰がアクセスしても同じ並びになり、
// 日付が変わると自動で入れ替わる(更新頻度シグナル用)。
function seededPicks(campaigns, count, dateKey) {
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) {
    seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  // 還元額上位の母集団から抽選することで、日替わりでも一定の質を保つ。
  const pool = [...campaigns]
    .sort((a, b) => bestYenValue(b) - bestYenValue(a))
    .slice(0, Math.max(count * 6, 40));
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export default async function Page() {
  let todayPicks = [];
  let todayLabel = "";
  try {
    const campaigns = await searchCampaigns("");
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    todayPicks = seededPicks(campaigns, 6, dateKey);
    todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`;
  } catch {
    // DB接続エラー時は「今日のおすすめ」を出さず、通常の検索UIのみ表示する。
  }

  return <SearchHome todayPicks={todayPicks} todayLabel={todayLabel} />;
}
