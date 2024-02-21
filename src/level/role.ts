import { Guild, Message } from "discord.js";
import { config } from "../utils/config";

/**
 * 役職がもらえる基準
 * @type {number[]} 基準となるレベル
 */
const levels: number[] = [1000000, 500000, 200000, 50000, 100];

/**
 * 役職を付与する
 * @param userId 対象ユーザー
 * @param guild 実行Guild
 * @param xp 現在の経験値
 * @returns なし
 */
export async function grantRole(userId: string, guild: Guild, xp: number) : Promise<void> {
    const member  = await guild.members.fetch(userId);
    const bot = await guild.members.fetch(config.clientId);

    if (member?.roles.highest.position! > bot?.roles.highest.position!) // Botより(役職位置が)高い人には付与しない
        return;
    
    const roles: string[] = config.roleIds.slice(0, 5).reverse();
    for (let i = 0; i < levels.length; i++) {
        if (xp >= levels[i] && !member?.roles.cache.has(config.roleIds[i])) {
            member?.roles.add(roles[i]);
            break;
        }
    }
}

/**
 * 実行ユーザーの経験値が一定基準より下回ったとき、役職を剥奪する
 * @param userId 実行ユーザーID
 * @param roleId 剥奪しようとしているロールID
 * @param guild 実行サーバID
 * @param xp 実行ユーザーの経験値
 * @returns なし
 */
export async function deprivationRole(userId: string, roleId: string, guild: Guild, xp: number) : Promise<void> {
    const member = await guild?.members.fetch(userId);
    const bot = await guild?.members.fetch(config.clientId);
    if (member?.roles.highest.position! > bot?.roles.highest.position!) { // NOTE: Botより高いやつからは奪わない
        console.log(`user_id: ${userId} -> 役職剥奪できない。`);
        return;
    };

    for (let i = 0; i < levels.length; i++) {
        if (levels[i] > xp && member?.roles.cache.has(roleId)) {
            member?.roles.remove(roleId);
        };
    }
};