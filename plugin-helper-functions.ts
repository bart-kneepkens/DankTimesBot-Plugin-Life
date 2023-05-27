import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { Bounty } from "./model/Bounty";
import { LifeChatData } from "./model/LifeChatData";
import { LifeUser } from "./model/LifeUser";
import { Strings } from "./Strings";

export class PluginHelperFunctions {

    constructor(
        private readonly lifeChatsData: Map<number, LifeChatData>,
        private readonly lifeUsers: LifeUser[]) { }

    public createBountiesString(bounties: Bounty[], chat: Chat): string {
        if (bounties.length === 0) {
            return "";
        }
        return bounties
            .sort((a, b) => {
                if (a.bounty > b.bounty) {
                    return -1;
                }
                if (a.bounty < b.bounty) {
                    return 1;
                }
                return 0;
            })
            .map((bounty) => {
                const targetUser = chat.getOrCreateUser(bounty.userId);
                const avatar = targetUser.currentAvatar ? `${targetUser.currentAvatar}  ` : "";
                let line = `${avatar}${targetUser.name}: ${bounty.bounty} points`;

                if (bounty.isPoliceBounty) {
                    line += " [ 🚓 ]";
                }
                return line;
            })
            .join("\n-\t");
    }

    public addPoliceBounty(chat: Chat, user: User, bounty: number): void {
        const lifeChatData = this.getOrCreateLifeChatsData(chat.id);
        let chatBounty = lifeChatData.bounties.find((chatBounty) => chatBounty.userId === user.id);

        if (!chatBounty) {
            chatBounty = { bounty: Math.round(bounty), isPoliceBounty: true, userId: user.id };
            lifeChatData.bounties.push(chatBounty);
        } else {
            chatBounty.bounty = Math.round(chatBounty.bounty + bounty);
            chatBounty.isPoliceBounty = true;
        }
    }

    public prepareKill(chat: Chat, user: User, match: string): { errorMsg: string, killCosts: number, targetUser: User } {
        const lifeUser = this.findOrCreateUser(user);

        if (lifeUser.occupation) {
            return { errorMsg: lifeUser.occupation.statusMessage(null), killCosts: null, targetUser: null };
        }
        if (!match) {
            return { errorMsg: Strings.killTooFewArgumentsError, killCosts: null, targetUser: null };
        }
        const parameters = match.split(" ");

        if (parameters.length < 1) {
            return { errorMsg: Strings.killTooFewArgumentsError, killCosts: null, targetUser: null };
        }
        const targetUser = this.getChatUserFromParameter(chat, parameters[0]);

        if (targetUser === null) {
            return { errorMsg: Strings.userDoesNotExist, killCosts: null, targetUser: null };
        }
        if (targetUser.id === user.id) {
            return { errorMsg: "If you want to kill yourself, go play Russian Roulette 🙄", killCosts: null, targetUser: null };
        }
        const targetLifeUser = this.findOrCreateUser(targetUser);

        if (targetLifeUser.occupation?.mayInterruptForHospitalisation === false) {
            return { errorMsg: targetLifeUser.occupation.statusMessage(targetLifeUser.user.name), killCosts: null, targetUser: null };
        }
        const targetWorthModifier = chat.getSetting<number>(Strings.KILL_COST_PERCENTAGE_SETTING) / 100;
        const bountyMultiplier = chat.getSetting<number>(Strings.KILL_COST_BOUNTY_MULTIPLIER_SETTING);
        const lifeChatData = this.getOrCreateLifeChatsData(chat.id);

        let killCost = targetUser.score * targetWorthModifier;
        killCost += (this.getTotalBountyForUser(lifeChatData.bounties, user.id) * bountyMultiplier);
        killCost = Math.round(Math.max(killCost, 100));

        if (killCost > user.score) {
            return { errorMsg: Strings.cantSpendMoreThanYouHave(killCost), killCosts: null, targetUser: null };
        }
        return { errorMsg: null, killCosts: killCost, targetUser: targetUser };
    }

    public getChatUserFromParameter(chat: Chat, parameter: string): User | null {
        const username = parameter.replace("@", "");
        const user = Array.from(chat.users.values()).find((u) => u.name.toLowerCase() === username.toLowerCase());
        return user ?? null;
    }

    public findOrCreateUser(chatUser: User): LifeUser {
        let user = this.lifeUsers.find(u => u.user === chatUser);
        if (!user) {
            this.lifeUsers.push(user = new LifeUser(chatUser));
        }
        return user;
    }

    public getOrCreateLifeChatsData(chatId: number): LifeChatData {
        let lifeChatData = this.lifeChatsData.get(chatId);

        if (!lifeChatData) {
            lifeChatData = { chatId: chatId, usersNotTagged: [], bounties: [], usersInHospital: [] };
            this.lifeChatsData.set(chatId, lifeChatData);
        }
        if (!lifeChatData.bounties) {
            lifeChatData.bounties = [];
        }
        if (!lifeChatData.usersInHospital) {
            lifeChatData.usersInHospital = [];
        }
        return lifeChatData;
    }

    public getTotalBountyForUser(bounties: Bounty[], userId: number) : number {
        return bounties
            .filter((bounty) => bounty.userId === userId)
            .map((bounty) => bounty.bounty)
            .reduce((sum, current) => sum + current, 0);
    }
}