import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { periodicExecution } from "../../module/file/periodicExecution";

// -----------------------------------------------------------------------------------------------------------
// レベルシステム情報リセット処理
// -----------------------------------------------------------------------------------------------------------
module.exports = {
    data: new SlashCommandBuilder() // スラッシュコマンド
		.setName('level_reset')
		.setDescription('レベルシステムの情報をリセットします'),
    async execute(interaction: CommandInteraction) {
        await interaction.deferReply({
            ephemeral: true
        })
        try {
            await periodicExecution(interaction.client);
            await interaction.editReply({
                content: "成功"
            });
        } catch(error) {
            console.log(error);
        }
	}
};