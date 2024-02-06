import { Client } from "discord.js";
import cron from "node-cron";
import { periodicExecution } from "../module/file/periodicExecution"
module.exports = {
    async execute(client: Client): Promise<void> {
        cron.schedule("0 0 0 * * *", async () => {
            await periodicExecution(client);
        });
    }
};