//必要なパッケージをインポートする
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { CustomCommand } from "./types/client";
import cron from "node-cron";
import { config } from "./utils/config";
import { deprivationRole } from './level/role.js';

// ボーナス受けた回数記録用(メッセージ)
export const messageBonusMap = new Map<string, number>();

// ボーナスを受けた回数記録用(ボイス)
export const vcBonusMap = new Map<string, number>();

// 稼いだXPを記録
export const earnedXpMap = new Map<string, number>();

// テストコードです。 経験値を格納するのに使用します。
export const users = new Map<string, number>();

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
		for (const user of Array.from(users.keys())) {
			const xp = users.get(user)!;
			const get = earnedXpMap.get(user) ? earnedXpMap.get(user)! : 0;

			const roles = (await guild.members.fetch(user)).roles;
			if (roles.cache.has(config.roleIds[2]) && 2500 > get) { // NOTE: 常連 かつ 本日稼いだ分が2500未満
				const dec = 2500 - get;
				console.log(`user_id: ${user}, 元xp: ${xp}, 減らす: ${dec}, 減らしたあと:${xp - dec}`);
				users.set(user, xp - dec);
				await deprivationRole(user, guild, users.get(user)!);
			} else if (roles.cache.has(config.roleIds[3]) && 5000 > get) {  // NOTE: 達人 
				const dec = 5000 - get;
				console.log(`user_id: ${user}, 元xp: ${xp}, 減らす: ${dec}, 減らしたあと:${xp - dec}`);
				users.set(user, xp - dec);
				await deprivationRole(user, guild, users.get(user)!);
			} else if (roles.cache.has(config.roleIds[4]) && 10000 > get) { // NOTE: 猫神
				const dec = 10000 - get;
				console.log(`user_id: ${user}, 元xp: ${xp}, 減らす: ${dec}, 減らしたあと:${xp - dec}`);
				users.set(user, xp - dec);
				await deprivationRole(user, guild, users.get(user)!);
			};
		}

		messageBonusMap.clear(); 	// メッセージ ボーナス制限 リセット
		vcBonusMap.clear();			// VC ボーナス制限 リセット
		earnedXpMap.clear();		// その日稼いだ分をリセット
	}
	catch (ex) {
		console.log(ex);
	}
}

client.login(process.env.DISCORD_TOKEN);