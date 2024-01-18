import { Events, Message } from 'discord.js';
import { grantRole } from '../level/role.js';

const coolDownMap = new Map<string, number>();
const bonusMap = new Map<string, number>();

// テストコードです。 経験値を格納するのに使用します。
const users = new Map<string, number>();

/* TODO: 経験値獲得処理の部分を、もうちょっといい感じにする。
    -> 例えば！: データ新規作成でも、きちんと、経験値を獲得できるようにする。

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
        const lastMessage = coolDownMap.get(message.author.id);
        const bonusCounter: number| undefined = bonusMap.get(message.author.id);

        if (lastMessage) {
            console.log(`[クールダウンテスト] user_id=${message.author.id}, クールダウン中`);
            return;
        };

        const obtainXp: number = Math.floor(Math.random() * (20 - 1 + 1)) +  1; // 獲得XP
        let xp: number | undefined = users.get(message.author.id);  // <-- テストコード。 自分が持っている経験値
        if (!xp) { // <-- データがない場合は新規作成。(もうちょっといい処理があるんだけど、思いつかないので一旦放置。)
            users.set(message.author.id, 1);
        } else {
            if (bonusCounter) {
                bonusMap.set(message.author.id, bonusCounter + 1);
                if (bonusCounter < 10) {
                    xp += obtainXp * 5;

                    console.log(`取得した経験値: ${obtainXp * 5}`);
                    console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${bonusMap.get(message.author.id)}`);
                } else {
                    console.log(`取得した経験値: ${obtainXp}`);
                    xp += obtainXp;
                };

            } else {
                bonusMap.set(message.author.id, 1); // ボーナスカウンタ 新規作成
                console.log(`[ボーナステスト] user_id=${message.author.id} 作成したよ`);

                console.log(`取得した経験値: ${obtainXp * 5}`);
                console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${bonusMap.get(message.author.id)}`);
                xp += obtainXp * 5;
            };

            console.log(`${message.author.id} の現在持っているXP: ${xp}`);
            users.set(message.author.id, xp);
            grantRole(message, xp);
        };

        coolDownMap.set(message.author.id, now); // ここで登録

        setTimeout(() => {
            coolDownMap.delete(message.author.id);
            console.log(`[クールダウンテスト] user_id=${message.author.id} 解除`)
        }, 5000); // 5秒待機して、解除
    }
};