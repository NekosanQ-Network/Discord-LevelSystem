import { Events, VoiceState } from "discord.js";

/**
    @type {string} ユーザーId
    @type {number} 接続した時間(UNIX TIME)
*/
const vcConnectTimeMap = new Map<string, number>();

const vcBonusExclusionMap = new Map<string, number>();

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
        const now = new Date();
        const unixTimeStamp = Math.floor(now.getTime() / 1000);
        const userId = oldState ? oldState.id : newState ? newState.id : "";
        const vcConnectTime: number | undefined = vcConnectTimeMap.get(userId);

        try {
            // 接続
            if (oldState.channel === null && newState.channel != null) {
                console.log(`user_id: ${newState.id} が接続したよ。 unixTimeStamp: ${unixTimeStamp}`);
                vcConnectTimeMap.set(newState.id, unixTimeStamp);
            } else if (oldState.channel != null && newState.channel === null) {
                console.log(`user_id: ${oldState.id} が切断したよ。`);

               if (vcConnectTime) {
                    console.log(`確認用: elapsed: ${unixTimeStamp - vcConnectTime}`);

                    if (!vcBonusExclusionMap.get(oldState.id) && unixTimeStamp - vcConnectTime >= 600) { // 10分以上経過している場合　かつ　初回
                        const xp = Math.floor((unixTimeStamp - vcConnectTime) / 10) - 60;

                        console.log(`2倍ボーナス除外: ${xp}`);
                        console.log(`2倍ボーナス対象: 60`);

                        console.log(`user_id: ${userId} の獲得XP -> ${xp + 60 * 2}`);

                        vcBonusExclusionMap.set(oldState.id, 1);
                    } else {
                        const xp = Math.floor((unixTimeStamp - vcConnectTime) / 10);
                        console.log(`user_id: ${userId} の獲得XP -> ${xp}`);
                    };
               };

            } else {
                console.log(`user_id: ${newState.id}, move from ${oldState.channelId} to ${newState.channelId}`);

                if (vcConnectTime) {
                    if (!vcBonusExclusionMap.get(oldState.id) && unixTimeStamp - vcConnectTime >= 600) { // 10分以上経過している場合 かつ 初回
                        const xp = Math.floor((unixTimeStamp - vcConnectTime) / 10) - 60;

                        console.log(`2倍ボーナス除外: ${xp}`);
                        console.log(`2倍ボーナス対象: 60`);

                        console.log(`user_id: ${userId} の獲得XP -> ${xp + 60 * 2}`);

                        vcBonusExclusionMap.set(oldState.id, 1);
                    } else {
                        const xp = Math.floor((unixTimeStamp - vcConnectTime) / 10);
                        console.log(`user_id: ${userId} の獲得XP -> ${xp}`);
                    };
                };

            };
        } catch (error) {
            console.log(error);
        }
    }
};