import { config } from "../../utils/config";
import { deprivationRole } from '../../level/role';
import { PrismaClient } from "@prisma/client";
import { Client } from "discord.js";
import { grantXP } from "../../level/grantXP";
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
 * @type {number} 合計接続時間(秒)
 */
export const vcBonusMap = new Map<string, number>();

/**
 * 今日稼いだ経験値
 *  @type {string} ユーザーID
 *  @type {number} 今日稼いだ経験値
 */
export const earnedXpMap = new Map<string, number>();

/**
 *  ボイスチャンネル滞在
 * 
    @type {string} ユーザーId
    @type {number} 接続した時間(UNIX TIME)
*/
export const vcConnectTimeMap = new Map<string, number>();

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

/**
 * XP減少 / 役職剥奪 / ボーナス回数, その週稼いだXP記録 リセット
 * @param client クライアント
 */
export async function periodicExecution(client: Client): Promise<void> {
    try {
        const guild = await client.guilds.fetch(config.generalGuildId);
        const users = await prisma.levels.findMany({
            select: {
                user_id: true,
                user_xp: true
            }
        });

        const now = new Date();
        const unixTimeStamp = Math.floor(now.getTime() / 1000);

        for (const user of users) {
            const xp: number = user.user_xp;
            const id: string = user.user_id;
            const get: number = earnedXpMap.get(id) || 0; // 取得分(week) が見つからない場合は0をいれる。

            const rolesAtMe = (await guild.members.fetch(id)).roles; // そのユーザーが持っている役職をすべて取得する

            for (let i = 0; i < levelsNorma.length; i++) {
                if (levelsNorma[i] > get && rolesAtMe.cache.has(roles[i])) { // ノルマ未達成
                    const decrease = levelsNorma[i] - get; // ノルマ - 獲得
                    await updateXP(id, xp - decrease);
                    await deprivationRole(id, roles[i], guild, xp - decrease);
                    console.log(`user_id: ${id}, 元xp: ${xp}, 減らす: ${decrease}, 減らしたあと:${xp - decrease}`);
                    break;
                }
            }

            const vcUser: number | undefined = vcConnectTimeMap.get(id);
            if (vcUser) { // VC接続中
                console.log(`user_id: ${id} VC レベル更新`);

                const isBonus = vcBonusMap.get(id) ? vcBonusMap.get(id)! < 600 : true; // ボーナス適用するか (初接続 or 600s未満だったら、true)
                const xp = grantXP(id, vcUser, unixTimeStamp, isBonus);

                const user = await prisma.levels.findFirst({
                    select: { user_xp: true },
                    where: { user_id: id }
                });

                await updateXP(id, user?.user_xp || 0 + xp!);
                vcConnectTimeMap.set(id, unixTimeStamp); // 接続開始時間更新
            } else 
                console.log(`user_id: ${id} VC レベル更新なし`);
        }

        // リセット
        messageBonusMap.clear();	// メッセージ
        vcBonusMap.clear();			// VC
        earnedXpMap.clear();		// その日稼いだXP
        console.log(`リセットした！`);
    } catch (ex) {
        console.log(ex);
    }
};

/**
 * 経験値更新処理
 * @param userId 対象ユーザー
 * @param xp 更新経験値
 */
async function updateXP(userId: string, xp: number) {
    await prisma.levels.updateMany({
        where: {
            user_id: userId
        },
        data: {
            user_xp: xp
        }
    });
}