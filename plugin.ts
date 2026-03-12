import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { WageSlaveOccupation, CriminalOccupation, HospitalisedOccupation } from "./model/Occupation";
import { LifeUser } from "./model/LifeUser";
import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Strings } from "./Strings";
import { Random } from "./Random";
import TelegramBot from "node-telegram-bot-api";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { EmptyEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/empty-event-arguments";
import { LifeChatData } from "./model/LifeChatData";
import { BotCommandConfirmationQuestion } from "../../src/bot-commands/bot-command-confirmation-question";
import { PluginHelperFunctions } from "./plugin-helper-functions";
import { Commands } from "./model/Commands";
import { ScoreChangeReason } from "./event/ScoreChangeReason";
import { Bounty } from "./model/Bounty";
import { ChatResetEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-reset-event-arguments";
import { CustomEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/custom-event-arguments";
import { ForceOccupationChangeEventData, OccupationChange } from "./event/ForceOccupationChangeEventData";
import { OccupationEnum } from "./model/OccupationEnum";
import { ForceActionOdds, LifeActionEventData } from "./event/LifeActionEventData";
import { LifeAction } from "./model/LifeAction";

export class Plugin extends AbstractPlugin {

    private static readonly LIFE_CHATS_DATA_FILE = "life-chats-data.json";

    private static readonly FORCE_OCCUPATION_CHANGE_REASON = "life.force-occupation-change";    // Life plugin listens to this custom plugin event
    private static readonly ON_LIFE_ACTION_REASON = "life.on-life-action";                      // Life plugin publishes this custom plugin event

    private readonly lifeChatsData: Map<number, LifeChatData> = new Map();
    private readonly lifeUsers: LifeUser[] = [];
    private readonly helper: PluginHelperFunctions;

    constructor() {
        super(Strings.PLUGIN_NAME, "1.3.0");
        this.subscribeToPluginEvent(PluginEvent.BotStartup, this.onBotStartup.bind(this));
        this.subscribeToPluginEvent(PluginEvent.BotShutdown, () => {
            this.lifeChatsData.forEach((data) => {
                data.usersInHospital?.forEach((uih) => {
                    const chat = this.getChat(data.chatId);
                    const user = chat!.getOrCreateUser(uih.userId);
                    const lifeUser = this.helper.findOrCreateUser(user);
                    uih.minutes = lifeUser.occupation!.remainingTimeMinutes;
                });
            });
            this.saveDataToFile(Plugin.LIFE_CHATS_DATA_FILE, this.lifeChatsData);
        });
        this.subscribeToPluginEvent(PluginEvent.ChatReset, this.onChatReset.bind(this));
        this.subscribeToPluginEvent(PluginEvent.Custom, this.onForceOccupationChange.bind(this), "*", Plugin.FORCE_OCCUPATION_CHANGE_REASON);
        this.helper = new PluginHelperFunctions(this.lifeChatsData, this.lifeUsers);
    }

    /// Override
    public getPluginSpecificCommands(): BotCommand[] {
        const lifeCommand = new BotCommand([Commands.life], `Display info about the ${Strings.PLUGIN_NAME} plugin`, this.displayPluginInfo.bind(this), true);
        const statusCommand = new BotCommand([Commands.status], "", this.displayStatus.bind(this), false);
        const workCommand = new BotCommand([Commands.work], "", this.work.bind(this), false);
        const crimeCommand = new BotCommand([Commands.crime1, Commands.crime2, Commands.crime3], "", this.hustle.bind(this), false);
        const breakoutCommand = new BotCommand([Commands.breakout], "", this.breakOut.bind(this), false);
        const officeCommand = new BotCommand([Commands.office], "", this.describeOffice.bind(this), false);
        const prisonCommand = new BotCommand([Commands.prison], "", this.describePrison.bind(this), false);
        const bribeCommand = new BotCommand([Commands.bribe], "", this.bribe.bind(this), false);
        const togglelifetagsCommand = new BotCommand([Commands.togglelifetags], "", this.toggleLifeTags.bind(this), false);
        const hospitalCommand = new BotCommand([Commands.hospital], "", this.describeHospital.bind(this), false);
        const bountiesCommand = new BotCommand([Commands.bounties], "", this.bounties.bind(this), false);
        const placeBountyCommand = new BotCommand([Commands.placebounty], "", this.placeBounty.bind(this), false);
        const killPlayerCommand = new BotCommand([Commands.kill], "", this.kill.bind(this), false);
        return [lifeCommand, statusCommand, workCommand, crimeCommand, breakoutCommand, officeCommand, prisonCommand, bribeCommand, togglelifetagsCommand,
            hospitalCommand, bountiesCommand, placeBountyCommand, killPlayerCommand];
    }

    /// Override
    public getPluginSpecificChatSettings(): Array<ChatSettingTemplate<any>> {
        return [
            new ChatSettingTemplate(Strings.WORK_MULTIPLIER_SETTING, "work reward multiplier", 1, (original) => Number(original), (value) => null),
            new ChatSettingTemplate(Strings.HUSTLE_MULTIPLIER_SETTING, "hustle reward multiplier", 1, (original) => Number(original), (value) => null),
            new ChatSettingTemplate(Strings.KILL_COST_PERCENTAGE_SETTING, "percentage of victim's points required to kill", 10, (original) => Number(original), (value) => null),
            new ChatSettingTemplate(Strings.KILL_COST_BOUNTY_MULTIPLIER_SETTING, "multiplier of killer's bounty required to kill", 1, (original) => Number(original), (value) => null),
            new ChatSettingTemplate(Strings.HOSPITAL_DURATION_MINUTES_SETTING, "duration in minutes player stays in hospital after 'killed'", 60 * 8, (original) => Number(original), (value) => null),
        ];
    }

    private onBotStartup(eventArgs: EmptyEventArguments): void {
        const chatsLifeDataArray = this.loadDataFromFile<LifeChatData[]>(Plugin.LIFE_CHATS_DATA_FILE);

        chatsLifeDataArray?.forEach(data => {
            this.lifeChatsData.set(data.chatId, data);

            // Correct bounties
            const correctedBounties: Bounty[] = [];

            for (const bounty of data.bounties ?? []) {
                const existingBountyForUser = correctedBounties.find((bountyToFind) => bountyToFind.userId === bounty.userId);

                if (existingBountyForUser) {
                    existingBountyForUser.bounty += bounty.bounty;
                    existingBountyForUser.isPoliceBounty ||= bounty.isPoliceBounty;

                } else {
                    const newBounty: Bounty = {
                        userId: bounty.userId,
                        bounty: bounty.bounty,
                        isPoliceBounty: bounty.isPoliceBounty
                    };
                    correctedBounties.push(newBounty);
                }
            }
            data.bounties = correctedBounties;

            // Apply hospitalisations
            data.usersInHospital?.forEach((userInHospital) => {
                const chatUser = this.getChat(data.chatId)!.getOrCreateUser(userInHospital.userId);
                const lifeUser = this.helper.findOrCreateUser(chatUser);

                lifeUser.hospitalise(userInHospital.minutes, () => {
                    if (!data.usersNotTagged.includes(chatUser.id)) {
                        this.sendMessage(data.chatId, `${lifeUser.mentionedUserName} ${Strings.releasedFromHospital}`);
                    }
                    data.usersInHospital = (data.usersInHospital ?? []).filter((uih) => uih.userId !== chatUser.id);
                });
            });
        });
    }

    private onChatReset(eventArgs: ChatResetEventArguments): void {
        const chatData = this.helper.getOrCreateLifeChatsData(eventArgs.chat.id);
        chatData.bounties = [];
        chatData.usersInHospital = [];

        const users = Array.from(eventArgs.chat.users.values());
        const lifeUsers = this.lifeUsers.filter(lifeUser => users.includes(lifeUser.user));
        lifeUsers.forEach(lifeUser => lifeUser.clearOccupation());
    }

    private onForceOccupationChange(eventArgs: CustomEventArguments): void {
        const args = eventArgs.eventData as ForceOccupationChangeEventData;
        const lifeChat = this.helper.getOrCreateLifeChatsData(args.chat.id);
        const lifeUser = this.helper.findOrCreateUser(args.user);
        const occupation = lifeUser.occupation;

        if (args.occupationChange === OccupationChange.RELEASE) {
            if (occupation === null || occupation.asEnum !== args.occupation) {
                args.success = false;
                args.errorMessage = "User is not currently in that occupation";

            } else {
                lifeUser.clearOccupation();
                args.success = true;
                args.errorMessage = "";
            }
        } else if (args.occupationChange === OccupationChange.FORCE_CONSCRIPT ||
            (args.occupationChange === OccupationChange.CONSCRIPT && (occupation === null || occupation.asEnum !== OccupationEnum.HOSPITAL))) {

            if (args.occupation === OccupationEnum.HOSPITAL) {
                const minutes = args.minutes > 0 ? args.minutes : args.chat.getSetting<number>(Strings.HOSPITAL_DURATION_MINUTES_SETTING);
                this.hospitaliseUser(lifeChat, lifeUser, minutes);

            } else if (args.occupation === OccupationEnum.JAIL) {
                const minutes = args.minutes > 0 ? args.minutes : this.randomIncarcerationDuration(true);
                this.incarcerateUser(lifeChat, lifeUser, minutes);

            } else if (args.occupation === OccupationEnum.OFFICE) {
                const minutes = args.minutes > 0 ? args.minutes : this.randomWorkDuration();
                this.putUserToWork(args.chat, lifeUser, minutes);
            }
            args.success = true;
            args.errorMessage = "";

        } else {
            args.success = false;
            args.errorMessage = "This occupation change is not allowed";
        }
    }

    /// Commands

    private describeOffice = (): string => {
        const entries = this.lifeUsers.filter(u => u.occupation instanceof WageSlaveOccupation).map(u => u.buildingEntry);
        if (entries.length == 0) {
            return Strings.officeEmpty;
        }
        return `${Strings.workingAtTheOffice}\n\n-\t` + entries.join("\n-\t");
    };

    private describePrison = (): string => {
        const entries = this.lifeUsers.filter(u => u.occupation instanceof CriminalOccupation).map(u => u.buildingEntry);
        if (entries.length == 0) {
            return Strings.prisonEmpty;
        }
        return `${Strings.currentlyInPrison}\n\n-\t` + entries.join("\n-\t");
    };

    private describeHospital(): string {
        const entries = this.lifeUsers.filter(u => u.occupation instanceof HospitalisedOccupation).map(u => u.buildingEntry);
        if (entries.length == 0) {
            return Strings.hospitalEmpty;
        }
        return `${Strings.currentlyInHospital}\n\n-\t` + entries.join("\n-\t");
    }

    private bounties(chat: Chat, user: User): string {
        const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);

        if (lifeChatData.bounties.length == 0) {
            return "There are no active bounties..";
        }
        const bountiesStr = this.helper.createBountiesString(lifeChatData.bounties, chat);
        return `${Strings.bounties}\n\n-\t${bountiesStr}`;
    }

    private placeBounty(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!match) {
            return Strings.placeBountyTooFewArgumentsError;
        }
        const parameters = match.split(" ");

        if (parameters.length < 2) {
            return Strings.placeBountyTooFewArgumentsError;
        }
        const targetUser = this.helper.getChatUserFromParameter(chat, parameters[0]);

        if (targetUser === null) {
            return Strings.userDoesNotExist;
        }
        const bounty = this.parseScoreInput(parameters[1]);

        if (bounty === null || bounty < 1 || bounty % 1 !== 0) {
            return Strings.provideValidPositiveNumber;
        }
        if (user.score < bounty) {
            return Strings.cantSpendMoreThanYouHave(bounty);
        }
        const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);
        let chatBounty = lifeChatData.bounties.find((chatBounty) => chatBounty.userId === targetUser.id);

        if (!chatBounty) {
            chatBounty = { bounty: bounty, isPoliceBounty: false, userId: targetUser.id };
            lifeChatData.bounties.push(chatBounty);
        } else {
            chatBounty.bounty += bounty;
        }
        chat.alterUserScore(new AlterUserScoreArgs(user, -bounty, Strings.PLUGIN_NAME, ScoreChangeReason.placedBounty));
        return Strings.placedBounty(user.name, bounty, targetUser.name);
    }

    private kill(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string | BotCommandConfirmationQuestion {
        const preparation = this.helper.prepareKill(chat, user, match);

        if (preparation.errorMsg) {
            return preparation.errorMsg;
        }
        const question = new BotCommandConfirmationQuestion();
        question.confirmationQuestionText = `💀 Making an attempt on ${preparation.targetUser!.name}'s life will cost ${preparation.killCosts} points. Type 'yes' to confirm.`;

        question.actionOnConfirm = () => {
            const preparation = this.helper.prepareKill(chat, user, match);

            if (preparation.errorMsg) {
                return preparation.errorMsg;
            }
            chat.alterUserScore(new AlterUserScoreArgs(user, -preparation.killCosts!, Strings.PLUGIN_NAME, ScoreChangeReason.killPlayer));
            const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);
            const bounty = lifeChatData.bounties.find((bounty) => bounty.userId === preparation.targetUser!.id);
            const targetLifeUser = this.helper.findOrCreateUser(preparation.targetUser!);
            const lifeUser = this.helper.findOrCreateUser(user);
            const woundedUsername = lifeChatData.usersNotTagged.includes(preparation.targetUser!.id) ? targetLifeUser.user.name : targetLifeUser.mentionedUserName;
            const eventData: LifeActionEventData = { chat, user, action: LifeAction.KILL, odds: 0.6, forceActionOdds: ForceActionOdds.NO_FORCE };
            this.fireCustomEvent(Plugin.ON_LIFE_ACTION_REASON, eventData);

            if (this.lifeActionBlocked(eventData)) {
                return Strings.actionBlocked(eventData.action);

            } else if (this.lifeActionSucceeded(eventData)) {
                const minutes = chat.getSetting<number>(Strings.HOSPITAL_DURATION_MINUTES_SETTING);
                this.hospitaliseUser(lifeChatData, lifeUser, minutes);
                let bountyReward = bounty ? bounty.bounty : 0;
                bountyReward = chat.alterUserScore(new AlterUserScoreArgs(user, bountyReward, Strings.PLUGIN_NAME, ScoreChangeReason.receivedBounty));

                if (!bounty || !bounty.isPoliceBounty) {
                    const bountyForUnlawfulKilling = 3040 * chat.getSetting<number>(Strings.HUSTLE_MULTIPLIER_SETTING);
                    this.helper.addPoliceBounty(chat, user, bountyForUnlawfulKilling);
                }
                if (bounty) {
                    lifeChatData.bounties.splice(lifeChatData.bounties.indexOf(bounty), 1);
                }
                return `💀 @${user.name} has mortally wounded ${woundedUsername} and claimed a ${bountyReward} points bounty!`;

            } else if (!bounty || !bounty.isPoliceBounty) {
                this.incarcerateUser(lifeChatData, lifeUser, this.randomIncarcerationDuration(true));
                return `😞 ${lifeUser.mentionedUserName} failed to kill ${woundedUsername} and has been imprisoned for ${Strings.minutes(lifeUser.occupation!.waitingTime)} for the unlawful attempt 👮🏻`;
            }
            return `😞 ${lifeUser.mentionedUserName} failed to kill ${woundedUsername}. They live to shitpost another day 🌞`;
        };
        return question;
    }

    private breakOut = (chat: Chat, user: User, msg: TelegramBot.Message): string => {
        const lifeUser = this.helper.findOrCreateUser(user);

        if (lifeUser.occupation) {
            return lifeUser.occupation.statusMessage(null);
        }

        if (msg.reply_to_message == null || msg.reply_to_message.from == null) {
            return Strings.breakoutInstructions;
        } else if (msg.reply_to_message.from.id === user.id) {
            return Strings.breakoutYourself;
        }

        const inmateUser = chat.getOrCreateUser(msg.reply_to_message.from.id);
        const inmate = this.helper.findOrCreateUser(inmateUser);

        if (!(inmate.occupation instanceof CriminalOccupation)) {
            return `${lifeUser.mentionedUserName} ${Strings.isNotInPrison(inmate.user.name)}`;
        }

        const eventData: LifeActionEventData = { chat, user, action: LifeAction.BREAKOUT, odds: 0.6, forceActionOdds: ForceActionOdds.NO_FORCE };
        this.fireCustomEvent(Plugin.ON_LIFE_ACTION_REASON, eventData);

        if (this.lifeActionBlocked(eventData)) {
            return Strings.actionBlocked(eventData.action);

        } else if (this.lifeActionSucceeded(eventData)) {
            inmate.clearOccupation();
            const scoreGained = 380 * chat.getSetting<number>(Strings.HUSTLE_MULTIPLIER_SETTING);
            chat.alterUserScore(new AlterUserScoreArgs(user, scoreGained, Strings.PLUGIN_NAME, ScoreChangeReason.breakoutSucceeded));

            this.helper.addPoliceBounty(chat, user, scoreGained);
            const freedUser = chat.getOrCreateUser(msg.reply_to_message.from.id);
            this.helper.addPoliceBounty(chat, freedUser, scoreGained);

            return `${lifeUser.mentionedUserName} ${Strings.didBreakOutInmate(inmate.user.name)}`;
        } else {
            const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);
            this.incarcerateUser(lifeChatData, lifeUser, this.randomIncarcerationDuration(false));
            return `${lifeUser.mentionedUserName} ${Strings.breakoutFailed(lifeUser.occupation!.waitingTime)}`;
        }
    };

    private bribe = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
        const args = match.split(" ");
        const inmate = this.helper.findOrCreateUser(user);

        if (!(inmate.occupation instanceof CriminalOccupation)) {
            return `${inmate.mentionedUserName} ${Strings.youAreNotInPrison}`;
        }

        if (args.length < 1) {
            return Strings.bribeInstruction;
        }
        const amount = this.parseScoreInput(args[0]);

        if (amount === null || amount < 1 || amount % 1 !== 0) {
            return Strings.provideValidPositiveNumber;
        }
        const totalFunds = user.score;

        if (amount > totalFunds) {
            return Strings.cantSpendMoreThanYouHave(amount);
        }
        const odds = (amount / totalFunds) * 4.2;
        const eventData: LifeActionEventData = { chat, user, action: LifeAction.BRIBE, odds, forceActionOdds: ForceActionOdds.NO_FORCE };
        this.fireCustomEvent(Plugin.ON_LIFE_ACTION_REASON, eventData);
        const actualBribedAmount = chat.alterUserScore(new AlterUserScoreArgs(user, -amount, Strings.PLUGIN_NAME, ScoreChangeReason.bribe));

        if (this.lifeActionBlocked(eventData)) {
            return Strings.actionBlocked(eventData.action);

        } else if (this.lifeActionSucceeded(eventData)) {
            inmate.clearOccupation();
            this.helper.addPoliceBounty(chat, user, amount);
            return Strings.bribingSuccessful;
        } else {
            return Strings.bribingFailed(actualBribedAmount);
        }
    };

    private toggleLifeTags = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
        const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);

        if (lifeChatData.usersNotTagged.includes(user.id)) {
            lifeChatData.usersNotTagged.splice(lifeChatData.usersNotTagged.indexOf(user.id), 1);
            return "🔊 You will now be tagged for Life updates!";
        } else {
            lifeChatData.usersNotTagged.push(user.id);
            return "🔇 You will no longer be tagged for Life updates!";
        }
    };

    private displayPluginInfo = (): string => {
        return Strings.pluginInfo;
    };

    private displayStatus = (chat: Chat, user: User): string => {
        return this.helper.findOrCreateUser(user).status;
    };

    private hustle = (chat: Chat, user: User): string => {
        const lifeUser = this.helper.findOrCreateUser(user);

        if (lifeUser.occupation) {
            return lifeUser.occupation.statusMessage(null);
        }
        const multiplier: number = chat.getSetting(Strings.HUSTLE_MULTIPLIER_SETTING);
        const eventData: LifeActionEventData = { chat, user, action: LifeAction.HUSTLE, odds: 0.6, forceActionOdds: ForceActionOdds.NO_FORCE };
        this.fireCustomEvent(Plugin.ON_LIFE_ACTION_REASON, eventData);

        if (this.lifeActionBlocked(eventData)) {
            return Strings.actionBlocked(eventData.action);

        } else if (this.lifeActionSucceeded(eventData)) {
            const scoreToGain = Random.number(60, 700) * multiplier;
            const actualScoreGained = chat.alterUserScore(new AlterUserScoreArgs(user, scoreToGain, Strings.PLUGIN_NAME, ScoreChangeReason.crimeCommited));
            this.helper.addPoliceBounty(chat, user, scoreToGain);
            return `${lifeUser.mentionedUserName} ${Strings.hustleSuccessful(actualScoreGained)}`;
        } else {
            const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);
            this.incarcerateUser(lifeChatData, lifeUser, this.randomIncarcerationDuration(false));
            return `${lifeUser.mentionedUserName} ${lifeUser.occupation!.startMessage}`;
        }
    };

    private work = (chat: Chat, user: User, msg: TelegramBot.Message, params: string): string => {
        const lifeUser = this.helper.findOrCreateUser(user);

        if (lifeUser.occupation) {
            return lifeUser.occupation.statusMessage(null);
        }
        let minutes: number;

        if (params) {
            minutes = Number(params);

            if (isNaN(minutes) || minutes < 1) {
                return `'${params}' is not a valid number of minutes 🙄`;
            }
            if (minutes > 60) {
                return "If you really want to work that hard then close this chat already 😤";
            }
        } else {
            minutes = this.randomWorkDuration();
        }
        const eventData: LifeActionEventData = { chat, user, action: LifeAction.WORK, odds: 0, forceActionOdds: ForceActionOdds.NO_FORCE };
        this.fireCustomEvent(Plugin.ON_LIFE_ACTION_REASON, eventData);

        if (eventData.forceActionOdds !== ForceActionOdds.BLOCK) {
            this.putUserToWork(chat, lifeUser, minutes);
            return `${lifeUser.mentionedUserName} ${lifeUser.occupation!.startMessage}`;
        }
        return Strings.actionBlocked(eventData.action);
    };

    private hospitaliseUser(chat: LifeChatData, user: LifeUser, minutes: number): void {
        if (chat.usersInHospital.find((uh) => uh.userId === user.user.id)) {
            return;
        }
        user.hospitalise(minutes, () => {
            if (!chat.usersNotTagged.includes(user.user.id)) {
                this.sendMessage(chat.chatId, `${user.mentionedUserName} ${Strings.releasedFromHospital}`);
            }
            chat.usersInHospital = chat.usersInHospital.filter((uih) => uih.userId !== user.user.id);
        });
        chat.usersInHospital.push({ userId: user.user.id, minutes: minutes });
    }

    private incarcerateUser(chat: LifeChatData, user: LifeUser, minutes: number): void {
        user.incarcerate(minutes, () => {
            if (!chat.usersNotTagged.includes(user.user.id)) {
                this.sendMessage(chat.chatId, `${user.mentionedUserName} ${Strings.releasedFromJail}`);
            }
        });
    }

    private putUserToWork(chat: Chat, user: LifeUser, minutes: number): void {
        user.startWork(minutes, () => {
            const multiplier: number = chat.getSetting(Strings.WORK_MULTIPLIER_SETTING);
            let scoreToGain = user.occupation!.waitingTime * 20 * multiplier;
            scoreToGain = chat.alterUserScore(new AlterUserScoreArgs(user.user, scoreToGain, Strings.PLUGIN_NAME, ScoreChangeReason.workCompleted));

            if (!this.lifeChatsData.get(chat.id)?.usersNotTagged.includes(user.user.id)) {
                this.sendMessage(chat.id, `${user.mentionedUserName} ${Strings.doneWorking(scoreToGain)}`);
            }
        });
    }

    private randomWorkDuration(): number {
        return Random.number(2, 10);
    }

    private randomIncarcerationDuration(unlawfulKill: boolean): number {
        const severity = unlawfulKill ? 25 : 10;
        return Random.number(severity, severity * 2);
    }

    private lifeActionBlocked(eventData: LifeActionEventData) {
        return eventData.forceActionOdds === ForceActionOdds.BLOCK;
    }

    private lifeActionSucceeded(eventData: LifeActionEventData) {
        return eventData.forceActionOdds === ForceActionOdds.FORCE_SUCCESS || (eventData.forceActionOdds === ForceActionOdds.NO_FORCE && Math.random() < eventData.odds);
    }
}