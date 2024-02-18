import { Client } from "discord.js";
import cron from "node-cron";
import { periodicExecution } from "../module/file/periodicExecution"
module.exports = {
    async execute(client: Client): Promise<void> {
        cron.schedule("0 0 * * 1", async () => { // 毎週土曜日 午前0時0分
            await periodicExecution(client);
        });
    }
};