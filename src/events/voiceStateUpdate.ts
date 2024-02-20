import { Events, Guild, VoiceState } from "discord.js";
import { vcBonusMap, earnedXpMap } from "../module/file/periodicExecution";
import { PrismaClient } from "@prisma/client";
import { sendDataToProcessId } from "pm2";
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
        console.log(vcConnectTimeMap);
        try {
            if (oldState.channel === null && newState.channel != null) {
                vcConnectTimeMap.set(userId, unixTimeStamp);
                console.log(`[VC接続] user_id: ${userId}, unixTimeStamp(JoinedTime): ${unixTimeStamp}`);
            } else if (oldState.channel != null && newState.channel === null && vcConnectTime) {
                if (!vcBonusMap.get(userId)) {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, true);
                } else {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, vcBonusMap.get(userId)! >= 600 ? false : true);
                }

                vcConnectTimeMap.delete(userId); // 出たら削除

            } else if (oldState.channel != null && newState.channel != null && vcConnectTime) {
                if (!vcBonusMap.get(userId)) {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, true);
                } else {
                    xp = grantXP(userId, vcConnectTime, unixTimeStamp, allUsers[0].user_xp, vcBonusMap.get(userId)! >= 600 ? false : true);
                }

                vcConnectTimeMap.delete(userId); // 出たら削除
            }

            if (allUsers) {
                await prisma.levels.updateMany({
                    where: {
                        user_id: userId
                    },
                    data: {
                        user_xp: allUsers[0].user_xp + xp
                    }
                })
            } else {
                await prisma.levels.create({
                    data: {
                        user_id: userId,
                        user_xp: xp
                    }
                })
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
export function grantXP(userId: string, joinedTime: number, leftTime: number, xp: number, isBonus: boolean) : number {
    let connectionTime = leftTime - joinedTime;
    let earnExp: number = 0;

    let vcBonus: number | undefined = vcBonusMap.get(userId);
    if (!vcBonus) {
        vcBonusMap.set(userId, connectionTime >= 600 ? 600 : connectionTime);
    } else {
        vcBonusMap.set(userId, connectionTime >= 600 ? 600 : vcBonus + connectionTime);
    }

    vcBonus = vcBonusMap.get(userId);
    if (isBonus)
        earnExp = Math.floor(connectionTime / 10) <= 60 ? Math.floor(connectionTime / 10) * 2 : (60 - Math.floor(connectionTime / 10)) * -1 + 60 * 2;
    else
        earnExp = Math.floor(connectionTime / 10);

    const earnedEXP : number | undefined = earnedXpMap.get(userId); // その日稼いだ経験値
    earnedXpMap.set(userId, (earnedEXP ? earnedEXP : 0) + earnExp);

    console.log(`user_id: ${userId}, 獲得XP: ${earnExp}, 合計接続時間(秒): ${vcBonus}, 合計XP: ${earnedXpMap.get(userId)}`);

    return earnExp;
};