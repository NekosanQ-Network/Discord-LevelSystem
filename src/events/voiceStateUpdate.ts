import { Events, VoiceState } from "discord.js";
import { vcBonusMap, earnedXpMap } from "..";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
    @type {string} ユーザーId
    @type {number} 接続した時間(UNIX TIME)
*/
const vcConnectTimeMap = new Map<string, number>();

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
        const now = new Date();
        const unixTimeStamp = Math.floor(now.getTime() / 1000);
        const userId = oldState ? oldState.id : newState ? newState.id : "";
        const vcConnectTime: number | undefined = vcConnectTimeMap.get(userId);

        let xp: number = 0;
        const allUsers = await prisma.levels.findMany({
            select: {
                user_id: true,
                user_xp: true
            },
            
            where: {
                user_id: userId
            }
        });

        try {
            if (oldState.channel === null && newState.channel != null) {
                vcConnectTimeMap.set(userId, unixTimeStamp);
                console.log(`[VC接続] user_id: ${userId}, unixTimeStamp(JoinedTime): ${unixTimeStamp}`);
            } else if (oldState.channel != null && newState.channel === null && vcConnectTime) {
                if (!vcBonusMap.get(userId) && unixTimeStamp - vcConnectTime >= 600) {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, true);
                } else {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, false);
                };

            } else if (oldState.channel != null && newState.channel != null && vcConnectTime) {
                if (!vcBonusMap.get(userId) && unixTimeStamp - vcConnectTime >= 600) {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, true);
                } else {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, false);
                };
            };

            if (allUsers) {
                await prisma.levels.updateMany({
                    where: {
                        user_id: userId
                    },
    
                    data: {
                        user_xp: allUsers[0].user_xp + xp
                    }
                });
            } else {
                await prisma.levels.create({
                    data: {
                        user_id: userId,
                        user_xp: xp
                    }
                });
            }
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
 * @param xp 実行ユーザー経験値
 * @param isBonus ボーナス付与するか？
 */
function grantXP(userId: string, joinedTime: number, leftTime: number, xp: number, isBonus: boolean) : number {
    let earnExp: number = Math.floor((leftTime - joinedTime) / 10);
    earnExp -= isBonus ? 60 : 0;                    // ボーナス有効時 -60
    let bonusExp: number = isBonus ? 60 * 2 : 0;    // ボーナス有効時 60 * 2

    if (isBonus) {
        vcBonusMap.set(userId, 1); // ボーナスを受け取れないようにする
    };

    const earnedEXP : number | undefined = earnedXpMap.get(userId); // その日稼いだ経験値
    earnedXpMap.set(userId, (earnedEXP ? earnedEXP : 0) + earnExp + bonusExp);

    console.log(`user_id: ${userId}, 獲得XP(計): ${earnExp + bonusExp}, 内訳(ボーナス対象外): ${earnExp}, 内訳(ボーナス対象): ${bonusExp}`);

    return earnExp + bonusExp;
};