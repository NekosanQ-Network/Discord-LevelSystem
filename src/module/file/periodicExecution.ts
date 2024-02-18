import { config } from "../../utils/config";
import { deprivationRole } from '../../level/role.js';
import { PrismaClient } from "@prisma/client";
import { Client } from "discord.js";
import { vcConnectTimeMap, grantXP } from "../../events/voiceStateUpdate.js";
const prisma = new PrismaClient();

/** 
 * ボーナス受けた回数記録用(メッセージ)
 * @type {string} ユーザーID
 * @type {number} ボーナス回数
 */ 
export const messageBonusMap = new Map<string, number>();

/** 
 *  ボーナスを受けた回数記録用(ボイス)
 * @type {string} ユーザーID
 * @type {number} 残りボーナス(XP)
 */
export const vcBonusMap = new Map<string, number>();

/**
 * 今日稼いだ経験値
 *  @type {string} ユーザーID
 *  @type {number} 今日稼いだ経験値
 */
export const earnedXpMap = new Map<string, number>();

/**
 * 経験値獲得ノルマ
 * @type {number[]} 経験値獲得のノルマ
 */
const levelsNorma: number[] = [10000, 5000, 2500];

/**
 * 使う役職
 * @type {string[]} 使用する役職
*/
const roles : string[] = config.roleIds.slice(2, 5).reverse();
// -----------------------------------------------------------------------------------------------------------
// XP減少 / 役職剥奪 / ボーナス回数, その日稼いだXP記録 リセット
// -----------------------------------------------------------------------------------------------------------
/**
 * @param client クライアント
 */
export async function periodicExecution(client: Client): Promise<void> {
    try {
        const guild = await client.guilds.fetch(config.generalGuildId);
        const allUsers = await prisma.levels.findMany({
            select: {
                user_id: true,
                user_xp: true
            },
        });

        const now = new Date();
        const unixTimeStamp = Math.floor(now.getTime() / 1000);
        for (const user of allUsers) {
            const xp = user.user_xp;
            const id = user.user_id;
            const get = earnedXpMap.get(id) ? earnedXpMap.get(id)! : 0;

            const _roles = (await guild.members.fetch(id)).roles;
            for (let i = 0; i < levelsNorma.length; i++) {
                if (levelsNorma[i] > get && _roles.cache.has(roles[i])) {
                    const decrease = levelsNorma[i] - get;
                    await prisma.levels.updateMany({
                        where: {
                            user_id: id
                        },
                        data: {
                            user_xp: xp - decrease
                        }
                    });

                    await deprivationRole(id, roles[i], guild, xp - decrease);
                    console.log(`user_id: ${id}, 元xp: ${xp}, 減らす: ${decrease}, 減らしたあと:${xp - decrease}`);
                }
            }

            const vcUser: number | undefined = vcConnectTimeMap.get(id);
            if (vcUser) {
                const user = await prisma.levels.findMany({
                    select: {
                        user_id: true,
                        user_xp: true
                    },

                    where: {
                        user_id: id
                    }
                });

                grantXP(id, vcUser, unixTimeStamp, user[0].user_xp, true);
            }
        }

        // リセット
        messageBonusMap.clear();	// メッセーじ
        vcBonusMap.clear();			// VC
        earnedXpMap.clear();		// その日稼いだXP
        console.log(`リセットした！`);
    }
    catch (ex) {
        console.log(ex);
    }
};