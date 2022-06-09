import { Bounty } from "./Bounty";

/**
 * Settings imported and exported from file.
 */
export interface LifeChatData  {
    chatId: number;
    usersNotTagged: number[];
    usersInHospital: { userId: number; minutes: number }[]
    bounties: Bounty[];
}