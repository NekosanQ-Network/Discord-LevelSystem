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

        let xp: number | undefined = users.get(message.author.id);  // <-- テストコード。 自分が持っている経験値
        if (!xp) { // NOTE: データがない場合は新規作成。
            users.set(message.author.id, 1);
            console.log(`user_id=${message.author.id} のデータを作成しました。`);
            grantXP(message, users.get(message.author.id)!);
        } else {
            grantXP(message, xp);
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
function grantXP(message: Message, xp: number) {
    const obtainXp: number = Math.floor(Math.random() * (20 - 1 + 1)) +  1; // 獲得XP
    const bonusCounter: number | undefined = messageBonusMap.get(message.author.id); // <-- ボーナスを受け取った回数
    const earnedXp: number | undefined = earnedXpMap.get(message.author.id);         // その日稼いだXP
    let get: number = 0;

    if (bonusCounter) { // NOTE: ボーナス関連データあり
        messageBonusMap.set(message.author.id, bonusCounter + 1);
        if (bonusCounter < 10) {
            xp += obtainXp * 5;
            get = obtainXp * 5;

            console.log(`獲得した経験値: ${obtainXp * 5}`);
            console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${messageBonusMap.get(message.author.id)}`);
        } else {
            xp += obtainXp;
            get = obtainXp;
            console.log(`獲得した経験値: ${obtainXp}`);
        };
    } else { // NOTE: ボーナスカウンタ作成
        messageBonusMap.set(message.author.id, 1); 
        console.log(`user_id=${message.author.id} のカウントデータを作成したよ`);

        xp += obtainXp * 5;
        get = obtainXp * 5;
        console.log(`獲得した経験値: ${obtainXp * 5}`);
        console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${messageBonusMap.get(message.author.id)}`);
    };

    if (!earnedXp) {
        earnedXpMap.set(message.author.id, 1 + get)
    } else {
        earnedXpMap.set(message.author.id, earnedXp + get);
    };

    users.set(message.author.id, xp);
    grantRole(message, xp);

    console.log(`${message.author.id} の今日獲得したXP: ${earnedXpMap.get(message.author.id)!}`)
    console.log(`${message.author.id} の現在持っているXP: ${xp}`);
}