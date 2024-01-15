import { Events, VoiceState } from "discord.js";

module.exports = {
    name: Events.VoiceServerUpdate,
    async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
        
    }
};