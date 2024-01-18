import { Message } from "discord.js";
import { config } from "../utils/config";

// -----------------------------------------------------------------------------------------------------------
// 特定XPに達したときに、それに応じた役職を付与する
// -----------------------------------------------------------------------------------------------------------
export async function grantRole(message: Message, xp: number) : Promise<void> {
    const member = await message.guild?.members.fetch(message.author.id);

    try {
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
    } catch (error) {
        console.error(`[役職付与] ${error}`);
    }
}