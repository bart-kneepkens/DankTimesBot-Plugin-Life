import { Bounty } from "./Bounty";

/**
 * Settings imported and exported from file.
 */
export interface LifeChatData  {
    chatId: number;
    usersNotTagged: number[];
    bounties: Bounty[];
}