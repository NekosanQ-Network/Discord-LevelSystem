import { Events, Message } from 'discord.js';

const coolDownMap = new Map<string, number>();
const bonusMap = new Map<string, number>();
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

        const xp: number = Math.floor(Math.random() * (20 - 1 + 1)) +  1;
        if (bonusCounter) {
            bonusMap.set(message.author.id, bonusCounter + 1);
            if (bonusCounter < 10) {
                console.log(`取得した経験値: ${xp * 5}`);
                console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${bonusMap.get(message.author.id)}`);
            } else {
                console.log(`取得した経験値: ${xp}`);
            };

        } else {
            bonusMap.set(message.author.id, 1); // ボーナスカウンタ 新規作成
            console.log(`[ボーナステスト] user_id=${message.author.id} 作成したよ`);

            console.log(`取得した経験値: ${xp * 5}`);
            console.log(`[ボーナステスト] user_id=${message.author.id} 回数更新, 現在: ${bonusMap.get(message.author.id)}`);
        };
    
        coolDownMap.set(message.author.id, now); // ここで登録

        setTimeout(() => {
            coolDownMap.delete(message.author.id);
            console.log(`[クールダウンテスト] user_id=${message.author.id} 解除`)
        }, 5000); // 5秒待機して、解除
    }
};