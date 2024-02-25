import { vcBonusMap, earnedXpMap } from "../module/file/periodicExecution";

/**
 * 経験値を付与します。
 * @param userId 実行ユーザーID
 * @param joinedTime VC参加時刻(UNIX Time)
 * @param leftTime  VC離脱時刻(UNIX Time)
 * @param isBonus ボーナス付与するか？
 */
export function grantXP(userId: string, joinedTime: number, leftTime: number, isBonus: boolean) : number{
    const connectionTime = leftTime - joinedTime; // 接続時間
    const maxConnectionTime = 600; // 最大接続時間

    if  (joinedTime == 0) // 抜けたときに joinedTimeが記録されていないとき
        return 0;

    let vcBonus = vcBonusMap.get(userId) || 0;
    vcBonus += Math.min(connectionTime, maxConnectionTime);
    vcBonusMap.set(userId, vcBonus); // 接続時間更新

    const earnExp = calculateEarnExp(connectionTime, isBonus);
    const totalEarnedExp: number = (earnedXpMap.get(userId) || 0) + earnExp; // 今まで獲得した経験値取得(1週間分)
    earnedXpMap.set(userId, totalEarnedExp);

    console.log(`user_id: ${userId}, 獲得XP: ${earnExp}, 接続時間(秒): ${connectionTime}, 合計接続時間(秒): ${vcBonus}, 合計XP: ${earnedXpMap.get(userId)}`);
    return earnExp;
}

/**
 * 経験値ボーナスの計算
 * @param connectionTime 接続時間 
 * @param isBonus ボーナス有効か
 * @returns 与える経験値
 */
function calculateEarnExp(connectionTime: number, isBonus: boolean): number {
    const expPer10Sec = Math.floor(connectionTime / 10); // 経験値(10秒で1XP)
    if (isBonus) { // ボーナス有効時
        return expPer10Sec <= 60 ? expPer10Sec * 2 : (60 - expPer10Sec) * -1 + 60 * 2; // 60xp以下であれば、そのまま2倍
    } else {
        return expPer10Sec;
    }
}