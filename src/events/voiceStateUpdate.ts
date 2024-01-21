import { Events, VoiceState } from "discord.js";
import { vcBonusMap, earnedXpMap, users } from "..";

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

        let xp: number | undefined = users.get(userId);  // <-- テストコード。 自分が持っている経験値
        if (!xp) { // NOTE: データがない場合は新規作成。
            users.set(userId, 0);
        }

        try {
            if (oldState.channel === null && newState.channel != null) {
                vcConnectTimeMap.set(userId, unixTimeStamp);
                console.log(`[VC接続] user_id: ${userId}, unixTimeStamp(JoinedTime): ${unixTimeStamp}`);
            } else if (oldState.channel != null && newState.channel === null && vcConnectTime) {
                if (!vcBonusMap.get(userId) && unixTimeStamp - vcConnectTime >= 600) { // NOTE: 10分以上経過 かつ その日が初回
                    grantXP(userId, vcConnectTime, unixTimeStamp, xp!, true);
                } else {
                    grantXP(userId, vcConnectTime, unixTimeStamp, xp!, false);
                };

                console.log(`[VC切断] user_id: ${userId}, unixTimeStamp(leftTime): ${unixTimeStamp}`);
            } else if (oldState.channel != null && newState.channel != null && vcConnectTime) {
                if (!vcBonusMap.get(userId) && unixTimeStamp - vcConnectTime >= 600) {
                    grantXP(userId, vcConnectTime, unixTimeStamp, xp!, true);
                } else {
                    grantXP(userId, vcConnectTime, unixTimeStamp, xp!, false);
                };

                console.log(`[VC移動] user_id: ${userId}`);
            };
        } catch (error) {
            console.log(error);
        }
    }
};
// -----------------------------------------------------------------------------------------------------------
// XP付与
// -----------------------------------------------------------------------------------------------------------
function grantXP(userId: string, joinedTime: number, leftTime: number, xp: number, isBonus: boolean) {
    let earnExp = Math.floor((leftTime - joinedTime) / 10);
    earnExp -= isBonus ? 60 : 0;           // ボーナス有効時 -60
    let bonusExp = isBonus ? 60 * 2 : 0;   // ボーナス有効時 60 * 2

    if (isBonus) {
        vcBonusMap.set(userId, 1); // ボーナスを受け取れないようにする
    }

    const earnedEXP : number | undefined = earnedXpMap.get(userId); // その日稼いだ経験値
    earnedXpMap.set(userId, (earnedEXP ? earnedEXP : 0) + earnExp + bonusExp);

    users.set(userId, xp + earnExp + bonusExp);
    console.log(`user_id: ${userId}, 獲得XP(計): ${earnExp + bonusExp}, 内訳(ボーナス対象外): ${earnExp}, 内訳(ボーナス対象): ${bonusExp}`);
}