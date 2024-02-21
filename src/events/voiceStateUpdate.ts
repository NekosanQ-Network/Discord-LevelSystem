import { Events, Guild, NonSystemMessageType, RESTPostOAuth2AccessTokenWithBotAndWebhookIncomingScopeResult, VoiceState } from "discord.js";
import { vcBonusMap, earnedXpMap } from "../module/file/periodicExecution";
import { PrismaClient } from "@prisma/client";
import { sendDataToProcessId } from "pm2";
import { grantRole } from "../level/role";
const prisma = new PrismaClient();

/**
 *  ボイスチャンネル滞在
 * 
    @type {string} ユーザーId
    @type {number} 接続した時間(UNIX TIME)
*/
export const vcConnectTimeMap = new Map<string, number>();

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
        const now = new Date();
        const unixTimeStamp = Math.floor(now.getTime() / 1000);
        const userId = oldState?.id || newState?.id || "";
        const guild = oldState?.guild || newState?.guild;
        const vcConnectTime: number = vcConnectTimeMap.get(userId) || 0;

        let xp: number = 0;

        const user = await prisma.levels.findMany({
            select: {
                user_id: true,
                user_xp: true
            },
            where: { user_id: userId }
        });

        const isBonus = vcBonusMap.get(userId) ? vcBonusMap.get(userId)! < 600 : true; // ボーナス適用するか (初接続 or 600s未満だったら、true)

        try {
            if (oldState?.channel === null && newState?.channel !=  null) {
                vcConnectTimeMap.set(userId, unixTimeStamp);
                console.log(`[VC接続] user_id: ${userId}, unixTimeStamp(JoinedTime): ${unixTimeStamp}`);
            } else if (oldState?.channel != null && newState?.channel === null) {
                grantXP(userId, vcConnectTime, unixTimeStamp, isBonus);
                vcConnectTimeMap.delete(userId);
            } else if (oldState?.channel != null && newState?.channel != null) {
                grantXP(userId, vcConnectTime, unixTimeStamp, isBonus);
                vcConnectTimeMap.delete(userId);
            }

            if (user[0]) {
                await prisma.levels.updateMany({
                    where: { user_id: userId },
                    data: { user_xp: user[0].user_xp + xp }
                });
            } else {
                await prisma.levels.create({
                    data: {
                        user_id: userId,
                        user_xp: xp
                    }
                });
            }

            grantRole(userId, guild, user[0].user_xp + xp);
        } catch (error) {
            console.log(error);
        }
    }
};

/**
 * 経験値を付与します。
 * @param userId 実行ユーザーID
 * @param joinedTime VC参加時刻(UNIX Time)
 * @param leftTime  VC離脱時刻(UNIX Time)
 * @param isBonus ボーナス付与するか？
 */
export function grantXP(userId: string, joinedTime: number, leftTime: number, isBonus: boolean) : number {
    const connectionTime = leftTime - joinedTime; // 接続時間
    const maxConnectionTime = 600; // 最大接続時間

    let  vcBonus = vcBonusMap.get(userId) || 0;
    vcBonus += Math.min(connectionTime, maxConnectionTime);
    vcBonusMap.set(userId, vcBonus); // 接続時間更新

    const earnExp = calculateEarnExp(connectionTime, isBonus);
    const totalEarnedExp: number = (earnedXpMap.get(userId) || 0) + earnExp; // 今まで獲得した経験値取得(1週間分)
    earnedXpMap.set(userId, totalEarnedExp);

    console.log(`user_id: ${userId}, 獲得XP: ${earnExp}, 接続時間(秒): ${connectionTime}, 合計接続時間(秒): ${vcBonus}, 合計XP: ${earnedXpMap.get(userId)}`);
    return earnExp;
};

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