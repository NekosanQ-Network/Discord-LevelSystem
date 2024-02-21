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
        if (message.guild === null) return; // 実行場所がサーバーでなかったら無視

        const now = Date.now();
        const coolDownNow = coolDownMap.get(message.author.id);

        if (coolDownNow) {
            console.log(`[クールダウンテスト] user_id=${message.author.id}, クールダウン中`);
            return;
        };

        const allUsers = await prisma.levels.findMany({
            select: {
                user_id: true,
                user_xp: true
            },
            where: {
                user_id: message.author.id
            }
        });

        let xp: number = 0;
        if (allUsers[0]) { // 更新
            if (messageBonusMap.get(message.author.id)! >= 10) {
                xp = grantXP(message, allUsers[0].user_xp, 0, false);
            } else {
                xp = grantXP(message, allUsers[0].user_xp, messageBonusMap.get(message.author.id) ? messageBonusMap.get(message.author.id)! : 0, true);
            };

            await prisma.levels.updateMany({
                where: {
                    user_id: String(message.author.id)
                },

                data: {
                    user_xp: allUsers[0].user_xp + xp
                }
            });
        } else { // 新規作成
            xp = grantXP(message, 0, 0, true);

            await prisma.levels.create({
                data: {
                    user_id: String(message.author.id),
                    user_xp: xp
                }
            });
        };

        grantRole(message.author.id, message.guild!, allUsers[0].user_xp + xp);

        coolDownMap.set(message.author.id, now); // NOTE: クールダウンの処理 5秒
        setTimeout(() => {
            coolDownMap.delete(message.author.id);
            console.log(`[クールダウンテスト] user_id=${message.author.id} 解除`)
        }, 5000);
    }
};
/**
 * 経験値を付与します。
 * @param message メッセージデータ
 * @param xp 実行ユーザー経験値
 * @param bonusCount ボーナスを受けた回数
 * @param isBonus ボーナスを付与するか？
 */
function grantXP(message: Message, xp: number, bonusCount: number, isBonus: boolean) : number {
    let earnExp: number = Math.floor(Math.random() * 20) + 1 * 1000;   // 獲得経験値。 1 - 20
    earnExp = isBonus ? earnExp * 5 : earnExp;                  // ボーナス有効時は5倍
    
    if (isBonus) {
        messageBonusMap.set(message.author.id, bonusCount + 1);
        console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${messageBonusMap.get(message.author.id)}`);
    };

    const earnedEXP: number | undefined = earnedXpMap.get(message.author.id); // その日稼いだ経験値
    earnedXpMap.set(message.author.id, (earnedEXP ? earnedEXP : 0) + earnExp);

    console.log(`${message.author.id} の今日獲得したXP: ${earnedXpMap.get(message.author.id)!}`)

    return earnExp;
};