//必要なパッケージをインポートする
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { CustomCommand } from "./types/client";
import cron from "node-cron";
import { config } from "./utils/config";
import { deprivationRole } from './level/role.js';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ボーナス受けた回数記録用(メッセージ)
export const messageBonusMap = new Map<string, number>();

// ボーナスを受けた回数記録用(ボイス)
export const vcBonusMap = new Map<string, number>();

// 稼いだXPを記録
export const earnedXpMap = new Map<string, number>();

/**
 * @type {number[]} 経験値獲得のノルマ
 */
const levelsNorma: number[] = [10000, 5000, 2500];

/**
 * @type {string[]} 使用する役職
*/
const roles : string[] = config.roleIds.slice(2, 5).reverse();

//.envファイルを読み込む
dotenv.config();

//Botで使うGetwayIntents、partials
const client: Client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Message, 
        Partials.Channel
    ],
});

client.commands = new Collection();

// -----------------------------------------------------------------------------------------------------------
// コマンドハンドラー
// -----------------------------------------------------------------------------------------------------------
const foldersPath: string = path.join(__dirname, 'commands');
const commandFolders: string[] = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath: string = path.join(foldersPath, folder);
	const commandFiles: string[] = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath: string = path.join(commandsPath, file);
		const command: CustomCommand = require(filePath) as CustomCommand;
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] ${filePath}のコマンドには、必須の "data "または "execute "プロパティがありません。`);
		}
	}
};
// -----------------------------------------------------------------------------------------------------------
// イベントハンドラー
// -----------------------------------------------------------------------------------------------------------
const eventsPath: string = path.join(__dirname, 'events');
const eventFiles: string[] = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath: string = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// -----------------------------------------------------------------------------------------------------------
// 定期実行 (試験用なので、5分おきに実行)
// -----------------------------------------------------------------------------------------------------------
cron.schedule("*/5 * * * *", async () => {
	await periodicExecution();
});
// -----------------------------------------------------------------------------------------------------------
// XP減少 / 役職剥奪 / ボーナス回数, その日稼いだXP記録 リセット
// -----------------------------------------------------------------------------------------------------------
async function periodicExecution() : Promise<void> {
	try {
		const guild = await client.guilds.fetch(config.generalGuildId);
        const allUsers = await prisma.levels.findMany({
            select: {
                user_id: true,
                user_xp: true
            },
        });

		for (const user of allUsers) {
			const xp = user.user_xp;
			const id = user.user_id;
			const get = earnedXpMap.get(id) ? earnedXpMap.get(id)! : 0;

			const _roles = (await guild.members.fetch(id)).roles;
			for (let i = 0; i < levelsNorma.length; i++) {
				if (levelsNorma[i] > get && _roles.cache.has(roles[i])) {
					const decrease = levelsNorma[i] - get;
					await prisma.levels.updateMany({
						where: {
							user_id: id
						},
		
						data: {
							user_xp: xp - decrease
						}
					});

					await deprivationRole(id, roles[i], guild, xp - decrease);
					console.log(`user_id: ${id}, 元xp: ${xp}, 減らす: ${decrease}, 減らしたあと:${xp - decrease}`);
				}
			}
		}

		// リセット
		messageBonusMap.clear();	// メッセーじ
		vcBonusMap.clear();			// VC
		earnedXpMap.clear();		// その日稼いだXP

		console.log(`リセットした！`);
	}
	catch (ex) {
		console.log(ex);
	}
};

client.login(process.env.DISCORD_TOKEN);