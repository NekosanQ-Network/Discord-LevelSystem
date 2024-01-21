import { Message } from "discord.js";
import { config } from "../utils/config";

// -----------------------------------------------------------------------------------------------------------
// 特定XPに達したときに、それに応じた役職を付与する
// -----------------------------------------------------------------------------------------------------------
export async function grantRole(message: Message, xp: number) : Promise<void> {
    const member = await message.guild?.members.fetch(message.author.id);
    const bot = await message.guild?.members.fetch(config.clientId);
    if (member?.roles.highest.position! > bot?.roles.highest.position!) { // NOTE: Botより高いやつにはあげない
        console.log(`あげようとしたやつ、Botより高いステージにいるから、役職あげないよ。帰れ。`);
        return;
    }

    if (xp >= 1000000 && !member?.roles.cache.has(config.roleIds[4])) { // "猫神"
        member?.roles.add(config.roleIds[4]);
    } else if (xp >= 500000 && !member?.roles.cache.has(config.roleIds[3])) { // "達人"
        member?.roles.add(config.roleIds[3]);
    } else if (xp >= 200000 && !member?.roles.cache.has(config.roleIds[2])) { // "常連"
        member?.roles.add(config.roleIds[2]);
    } else if (xp >= 50000 && !member?.roles.cache.has(config.roleIds[1])) { // "新規卒"
        member?.roles.add(config.roleIds[1]);
    } else if (xp >= 100 && !member?.roles.cache.has(config.roleIds[0])) { // "新規"
        member?.roles.add(config.roleIds[0]);
    };
}
// -----------------------------------------------------------------------------------------------------------
// 基準を下回ったときに、役職を剥奪する
// -----------------------------------------------------------------------------------------------------------
export async function deprivationRole(message: Message, xp: number) : Promise<void> {
    const member = await message.guild?.members.fetch(message.author.id);
    const bot = await message.guild?.members.fetch(config.clientId);
    if (member?.roles.highest.position! > bot?.roles.highest.position!) { // NOTE: Botより高いやつからは奪わない
        console.log(`奪おうとしたやつ、Botより高いステージにいるから、役職奪えないよ。帰れ。`);
        return;
    }

    if (xp < 1000000 && member?.roles.cache.has(config.roleIds[4])) {
        member?.roles.remove(config.roleIds[4]);
    } else if (xp < 500000 && member?.roles.cache.has(config.roleIds[3])) {
        member?.roles.remove(config.roleIds[3]);
    } else if (xp < 200000 && member?.roles.cache.has(config.roleIds[2])) {
        member?.roles.remove(config.roleIds[2]);
    } else if (xp < 50000 && member?.roles.cache.has(config.roleIds[1])) {
        member?.roles.remove(config.roleIds[1]);
    }
}