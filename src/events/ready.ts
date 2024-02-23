import { Events, Client } from "discord.js";
import { logger } from "../utils/log";
import { executePeriodically } from "../guildProcess/periodically";

// -----------------------------------------------------------------------------------------------------------
// 起動処理
// -----------------------------------------------------------------------------------------------------------
module.exports = {
	name: Events.ClientReady,
	once: false,
	execute(client: Client) {
		const date = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

		executePeriodically(client);

		setInterval(() => {
			client.user?.setActivity({
				name: `/ | ${client.ws.ping}ms | 最終更新: ${date}`
			});
		  }, 10000);
		logger.info(`[INFO] 起動完了: ${client.user?.tag}`);
	},
};