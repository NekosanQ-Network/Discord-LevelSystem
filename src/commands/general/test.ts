import { CommandInteraction, SlashCommandBuilder, } from "discord.js";
// -----------------------------------------------------------------------------------------------------------
// interactionの
// -----------------------------------------------------------------------------------------------------------
module.exports = {
	data: new SlashCommandBuilder()
		.setName("test")
		.setDescription("テスト用コマンドです"),
	async execute(interaction: CommandInteraction): Promise<void> {
		await interaction.reply({
            content: "成功: Discord.js in TypeScript",
            allowedMentions: { repliedUser: false }
        });
	},
};