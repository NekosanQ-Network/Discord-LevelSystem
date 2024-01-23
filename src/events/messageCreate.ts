import { Events, Message } from 'discord.js';
import { grantRole } from '../level/role.js';
import { users, earnedXpMap, messageBonusMap  } from "../index.js";

const coolDownMap = new Map<string, number>();

/* TODO: 経験値獲得処理の部分を、もうちょっといい感じにする。
    -> (完成次第、)データベースに書き込めるようにすることを忘れないように。

    2024.01.19 AM1時
*/

// -----------------------------------------------------------------------------------------------------------
// メッセージ処理
// -----------------------------------------------------------------------------------------------------------
module.exports = {
    name: Events.MessageCreate,
    async execute(message: Message): Promise<void> {
        if (message.author.bot) return;

        const now = Date.now();
        const coolDownNow = coolDownMap.get(message.author.id);

        if (coolDownNow) {
            console.log(`[クールダウンテスト] user_id=${message.author.id}, クールダウン中`);
            return;
        };

        const xp: number | undefined = users.get(message.author.id);  // <-- テストコード。 自分が持っている経験値
        if (!xp) {
            users.set(message.author.id, 6000);
            grantXP(message, users.get(message.author.id)! - 1, 0, true);
        } else {
            if (messageBonusMap.get(message.author.id)! >= 10) {
                grantXP(message, xp, 0, false);
            } else {
                grantXP(message, xp, messageBonusMap.get(message.author.id) ? messageBonusMap.get(message.author.id)! : 0, true);
            };
        };

        coolDownMap.set(message.author.id, now); // NOTE: クールダウンの処理 5秒
        setTimeout(() => {
            coolDownMap.delete(message.author.id);
            console.log(`[クールダウンテスト] user_id=${message.author.id} 解除`)
        }, 5000);
    }
};
// -----------------------------------------------------------------------------------------------------------
// XP付与
// -----------------------------------------------------------------------------------------------------------
function grantXP(message: Message, xp: number, bonusCount: number, isBonus: boolean) {
    let earnExp: number = Math.floor(Math.random() * 20) + 1;   // 獲得経験値。 1 - 20
    earnExp = isBonus ? earnExp * 5 : earnExp;                  // ボーナス有効時は5倍
    
    if (isBonus) {
        messageBonusMap.set(message.author.id, bonusCount + 1);
        console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${messageBonusMap.get(message.author.id)}`);
    };

    const earnedEXP : number | undefined = earnedXpMap.get(message.author.id); // その日稼いだ経験値
    earnedXpMap.set(message.author.id, (earnedEXP ? earnedEXP : 0) + earnExp);

    users.set(message.author.id, xp + earnExp);
    grantRole(message, xp);

    console.log(`${message.author.id} の今日獲得したXP: ${earnedXpMap.get(message.author.id)!}`)
    console.log(`${message.author.id} の現在持っているXP: ${xp + earnExp}`);
}