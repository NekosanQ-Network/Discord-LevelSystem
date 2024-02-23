import { Events, Message } from 'discord.js';
import { grantRole } from '../level/role.js';
import { earnedXpMap, messageBonusMap  } from "../module/file/periodicExecution.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * @type {string} ユーザーID
 * @type {number} クールダウン開始時刻
 */
const coolDownMap = new Map<string, number>();

// -----------------------------------------------------------------------------------------------------------
// メッセージ処理
// -----------------------------------------------------------------------------------------------------------
module.exports = {
    name: Events.MessageCreate,
    async execute(message: Message): Promise<void> {
        if (message.author.bot) return;
        if (message.guild === null) return; // NOTE: 実行場所がサーバーでなかったら無視

        const now = Date.now();
        const coolDownNow = coolDownMap.get(message.author.id);

        if (coolDownNow) // NOTE: クールダウン中
            return;

        let xp: number = 0;
        const user = await prisma.levels.findFirst({
           select: {
                user_id: true,
                user_xp: true
            },
            where: { user_id: message.author.id }
        });

        if (user) { // 更新
            const boostCount = messageBonusMap.get(message.author.id) || 0;
            const isBoosting = boostCount < 10; // ブースト回数 10回以下でtrue

            xp = grantXP(message.author.id, user.user_xp, boostCount, isBoosting);

            await prisma.levels.updateMany({
                where: { user_id: String(message.author.id) },
                data: { user_xp: user.user_xp + xp }
            });
        } else { // 新規作成
            xp = grantXP(message.author.id, 0, 0, true);

            await prisma.levels.create({
                data: {
                    user_id: String(message.author.id),
                    user_xp: xp
                }
            });
        }

        grantRole(message.author.id, message.guild!, user!.user_xp + xp);
        coolDownMap.set(message.author.id, now); // NOTE: クールダウンの処理 5秒

        setTimeout(() => {
            coolDownMap.delete(message.author.id);
        }, 5000);
    }
};

/**
 * 経験値を付与します。
 * @param userId ユーザーId
 * @param xp 実行ユーザー経験値
 * @param boostCount ブースト回数
 * @param isBoosting ブースト有効の可否
 */
function grantXP(userId: string, xp: number, boostCount: number, isBoosting: boolean) : number {
    let earnExp: number = Math.floor(Math.random() * 20) + 1;   // 獲得経験値。 1 - 20
    earnExp = isBoosting ? earnExp * 5 : earnExp;               // ブースト有効時は5倍
    
    if (isBoosting) { // ブースト有効
        messageBonusMap.set(userId, boostCount + 1);
        console.log(`[ボーナステスト] user_id=${userId} 回数更新, 現在: ${messageBonusMap.get(userId)}`);
    }

    let earnedXp: number = earnedXpMap.get(userId) || 0; // 1週間に稼いだ経験値
    earnedXpMap.set(userId, earnedXp + earnExp);

    console.log(`${userId} の今日獲得したXP: ${earnedXpMap.get(userId)!}`)
    return earnExp;
}