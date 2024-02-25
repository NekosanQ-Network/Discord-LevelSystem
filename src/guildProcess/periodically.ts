import { Client } from "discord.js";
import cron from "node-cron";
import { periodicExecution } from "../module/file/periodicExecution"

export async function executePeriodically(client: Client): Promise<void> {
    cron.schedule("0 0 * * 6", async () => { // 毎週土曜日 午前0時0分 (0 0 * * 6)
        await periodicExecution(client);
    });
}
