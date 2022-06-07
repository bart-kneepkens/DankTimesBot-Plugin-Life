import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { WageSlaveOccupation, CriminalOccupation, HospitalisedOccupation } from "./Occupation";
import { LifeUser } from "./LifeUser";
import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Strings } from './Strings';
import { Random } from "./Random";
import TelegramBot from "node-telegram-bot-api";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { EmptyEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/empty-event-arguments";
import { LifeChatData } from "./LifeChatData";
import { Bounty } from "./Bounty";
import { BotCommandConfirmationQuestion } from "../../src/bot-commands/bot-command-confirmation-question";

const PLUGIN_NAME = "Life";
const WORK_MULTIPLIER_SETTING = "life.work.multiplier";
const HUSTLE_MULTIPLIER_SETTING = "life.hustle.multiplier";

export enum Commands {
  life = "life",
  status = "status",
  work = "work",
  crime = "hustle",
  breakout = "breakout",
  office = "office",
  prison = "prison",
  bribe = "bribe",
  togglelifetags = "togglelifetags",
  hospital = "hospital",
  bounties = "bounties",
  placebounty = "placebounty",
  kill = "kill",
}

export enum ScoreChangeReason {
  crimeCommited = `crimeCommitted`,
  workCompleted = `workCompleted`,
  bribe = `bribe`,
  breakoutSucceeded = `breakoutSucceeded`,
  placedBounty = 'placedBounty',
  killPlayer = 'killPlayer',
  receivedBounty = 'receivedBounty'
}

export class Plugin extends AbstractPlugin {

  private static readonly LIFE_CHATS_DATA_FILE = "life-chats-data.json";

  private readonly lifeChatsData: Map<number, LifeChatData> = new Map();
  private lifeUsers: LifeUser[] = [];

  constructor() {
    super(PLUGIN_NAME, "1.3.0-alpha");
    this.subscribeToPluginEvent(PluginEvent.BotStartup, this.onBotStartup.bind(this));
    this.subscribeToPluginEvent(PluginEvent.BotShutdown, () => this.saveDataToFile(Plugin.LIFE_CHATS_DATA_FILE, this.lifeChatsData));
  }

  /// Override
  public getPluginSpecificCommands(): BotCommand[] {
    const lifeCommand = new BotCommand([Commands.life], `Display info about the ${PLUGIN_NAME} plugin`, this.displayPluginInfo.bind(this), true);
    const statusCommand = new BotCommand([Commands.status], "", this.displayStatus.bind(this), false);
    const workCommand = new BotCommand([Commands.work], "", this.work.bind(this), false);
    const crimeCommand = new BotCommand([Commands.crime], "", this.hustle.bind(this), false);
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
      new ChatSettingTemplate(WORK_MULTIPLIER_SETTING, "work reward multiplier", 1, (original) => Number(original), (value) => null),
      new ChatSettingTemplate(HUSTLE_MULTIPLIER_SETTING, "hustle reward multiplier", 1, (original) => Number(original), (value) => null),
    ];
  }

  private onBotStartup(eventArgs: EmptyEventArguments): void {
    const chatsLifeDataArray = this.loadDataFromFile<LifeChatData[]>(Plugin.LIFE_CHATS_DATA_FILE);
    chatsLifeDataArray?.forEach(data => this.lifeChatsData.set(data.chatId, data));
  }

  /// Commands

  private describeOffice = (): string => {
    const entries = this.lifeUsers.filter(u => u.occupation instanceof WageSlaveOccupation).map(u => u.buildingEntry);
    if (entries.length == 0) {
      return Strings.officeEmpty;
    }
    return `${Strings.workingAtTheOffice}\n-\t` + entries.join("\n-\t");
  }

  private describePrison = (): string => {
    const entries = this.lifeUsers.filter(u => u.occupation instanceof CriminalOccupation).map(u => u.buildingEntry);
    if (entries.length == 0) {
      return Strings.prisonEmpty;
    }
    return `${Strings.currentlyInPrison}\n-\t` + entries.join("\n-\t");
  }

  private describeHospital(): string {
    const entries = this.lifeUsers.filter(u => u.occupation instanceof HospitalisedOccupation).map(u => u.buildingEntry);
    if (entries.length == 0) {
      return Strings.hospitalEmpty;
    }
    return `${Strings.currentlyInHospital}\n-\t` + entries.join("\n-\t");
  }

  private bounties(chat: Chat, user: User): string {
    const lifeChatData = this.getOrCreateLifeChatsData(chat.id);

    if (lifeChatData.bounties.length == 0) {
      return 'There are no active bounties..';
    }
    const policeBounties = lifeChatData.bounties.filter((bounty) => bounty.isPoliceBounty);
    const playerBounties = lifeChatData.bounties.filter((bounty) => !bounty.isPoliceBounty);

    const policeBountiesStr = this.createBountiesString(policeBounties, chat);
    const playerBountiesStr = this.createBountiesString(playerBounties, chat);
    let bountyStr = '';

    if (policeBountiesStr.length > 0) {
      bountyStr += `${Strings.policeBounties}\n-\t${policeBountiesStr}`;
    }
    if (playerBountiesStr.length > 0) {
      if (bountyStr.length > 0) {
        bountyStr += `\n\n`;
      }
      bountyStr += `${Strings.playerBounties}\n-\t${playerBountiesStr}`;
    }
    return bountyStr;
  }

  private placeBounty(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
    if (!match) {
      return Strings.placeBountyTooFewArgumentsError;
    }
    const parameters = match.split(' ');

    if (parameters.length < 2) {
      return Strings.placeBountyTooFewArgumentsError;
    }
    const targetUser = this.getChatUserFromParameter(chat, parameters[0]);

    if (targetUser === null) {
      return Strings.userDoesNotExist;
    }
    let bounty = this.parseScoreInput(parameters[1]);

    if (bounty === null || bounty < 1 || bounty % 1 !== 0) {
      return Strings.provideValidPositiveNumber;
    }
    if (user.score < bounty) {
      return Strings.cantSpendMoreThanYouHave;
    }
    const lifeChatData = this.getOrCreateLifeChatsData(chat.id);
    let chatBounty = lifeChatData.bounties.find((chatBounty) => !chatBounty.isPoliceBounty && chatBounty.userId === targetUser.id);

    if (!chatBounty) {
      chatBounty = { bounty: bounty, isPoliceBounty: false, userId: targetUser.id };
      lifeChatData.bounties.push(chatBounty);
    } else {
      chatBounty.bounty += bounty;
    }
    chat.alterUserScore(new AlterUserScoreArgs(user, -bounty, PLUGIN_NAME, ScoreChangeReason.placedBounty));
    return Strings.placedBounty(user.name, bounty, targetUser.name);
  }

  private kill(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string | BotCommandConfirmationQuestion {
    const preparation = this.prepareKill(chat, user, match);

    if (preparation.errorMsg) {
      return preparation.errorMsg;
    }
    const question = new BotCommandConfirmationQuestion();
    question.confirmationQuestionText = `💀 Making an attempt on ${preparation.targetUser.name}'s life will cost ${preparation.killCosts} points. Type 'yes' to confirm.`;
    
    question.actionOnConfirm = () => {
      const preparation = this.prepareKill(chat, user, match);

      if (preparation.errorMsg) {
        return preparation.errorMsg;
      }
      chat.alterUserScore(new AlterUserScoreArgs(user, -preparation.killCosts, PLUGIN_NAME, ScoreChangeReason.killPlayer));
      const lifeChatData = this.getOrCreateLifeChatsData(chat.id);
      const bounties = lifeChatData.bounties.filter((bounty) => bounty.userId === preparation.targetUser.id);
      const targetLifeUser = this.findOrCreateUser(preparation.targetUser.name);
      const lifeUser = this.findOrCreateUser(user.name);

      if (Random.number(0, 100) >= 40) {   
        targetLifeUser.hospitalise(() => {
          if (!lifeChatData.usersNotTagged.includes(preparation.targetUser.id)) {
            this.sendMessage(chat.id, `${targetLifeUser.mentionedUserName} ${Strings.releasedFromHospital}`);
          }
        });

        let bountyReward = bounties.map((bounty) => bounty.bounty).reduce((sum, current) => sum + current);
        bountyReward = chat.alterUserScore(new AlterUserScoreArgs(user, bountyReward, PLUGIN_NAME, ScoreChangeReason.receivedBounty));

        if (!bounties.find((bounty) => bounty.isPoliceBounty)) {
          const bountyForUnlawfulKilling = 700 * chat.getSetting<number>(HUSTLE_MULTIPLIER_SETTING);
          this.addPoliceBounty(chat, user, bountyForUnlawfulKilling);
        }
        bounties.forEach((bounty) => lifeChatData.bounties.splice(lifeChatData.bounties.indexOf(bounty), 1));
        return `💀 @${user.name} has mortally wounded ${targetLifeUser.mentionedUserName} and claimed a ${bountyReward} points bounty!`;

      } else if (!bounties.find((bounty) => bounty.isPoliceBounty)) {
        const bountyForUnlawfulKillingAttempt = 350 * chat.getSetting<number>(HUSTLE_MULTIPLIER_SETTING);
        this.addPoliceBounty(chat, user, bountyForUnlawfulKillingAttempt);

        lifeUser.incarcerate(() => {
          if (!lifeChatData.usersNotTagged.includes(user.id)) {
            this.sendMessage(chat.id, `${lifeUser.mentionedUserName} ${Strings.releasedFromJail}`);
          }
        });
        return `😞 ${lifeUser.mentionedUserName} failed to kill ${targetLifeUser.mentionedUserName} and has been imprisoned for ${Strings.minutes(lifeUser.occupation.waitingTime)} for the unlawful attempt 👮🏻`;
      }
      return `😞 ${lifeUser.mentionedUserName} failed to kill ${targetLifeUser.mentionedUserName}. They live to shitpost another day 🌞`;
    };
    return question;
  }

  private breakOut = (chat: Chat, user: User, msg: TelegramBot.Message): string => {
    const lifeUser = this.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
      return lifeUser.occupation.statusMessage(null);
    }

    if (msg.reply_to_message == null || msg.reply_to_message.from == null) {
      return Strings.breakoutInstructions;
    } else if (msg.reply_to_message.from.id === user.id) {
      return Strings.breakoutYourself;
    }

    const inmate = this.findOrCreateUser(msg.reply_to_message.from.username);

    if (!(inmate.occupation instanceof CriminalOccupation)) {
      return `${lifeUser.mentionedUserName} ${Strings.isNotInPrison(inmate.username)}`;
    }

    let successful = Math.random() >= 0.35;

    if (successful) {
      inmate.clearOccupation();
      const scoreGained = 230 * chat.getSetting<number>(HUSTLE_MULTIPLIER_SETTING);
      chat.alterUserScore(new AlterUserScoreArgs(user, scoreGained, PLUGIN_NAME, ScoreChangeReason.breakoutSucceeded));

      this.addPoliceBounty(chat, user, scoreGained);
      const freedUser = chat.getOrCreateUser(msg.reply_to_message.from.id);
      this.addPoliceBounty(chat, freedUser, scoreGained);

      return `${lifeUser.mentionedUserName} ${Strings.didBreakOutInmate(inmate.username)}`;
    } else {
      lifeUser.incarcerate(() => {
        const lifeChatData = this.getOrCreateLifeChatsData(chat.id);

        if (!lifeChatData.usersNotTagged.includes(user.id)) {
          this.sendMessage(chat.id, `${lifeUser.mentionedUserName} ${Strings.releasedFromJail}`);
        }
      });
      return `${lifeUser.mentionedUserName} ${Strings.breakoutFailed(lifeUser.occupation.waitingTime)}`;
    }
  }

  private bribe = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
    const args = match.split(" ");
    const inmate = this.findOrCreateUser(user.name);

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
      return Strings.cantSpendMoreThanYouHave;
    }
    const chance = (amount / totalFunds);
    const succeeds = Math.random() < (chance * 4.2);
    const actualBribedAmount = chat.alterUserScore(new AlterUserScoreArgs(user, -amount, PLUGIN_NAME, ScoreChangeReason.bribe));

    if (succeeds) {
      inmate.clearOccupation();
      this.addPoliceBounty(chat, user, amount);
      return Strings.bribingSuccessful;
    } else {
      return Strings.bribingFailed(actualBribedAmount);
    }
  }

  private toggleLifeTags = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
    const lifeChatData = this.getOrCreateLifeChatsData(chat.id);

    if (lifeChatData.usersNotTagged.includes(user.id)) {
      lifeChatData.usersNotTagged.splice(lifeChatData.usersNotTagged.indexOf(user.id), 1);
      return "🔊 You will now be tagged for Life updates!";
    } else {
      lifeChatData.usersNotTagged.push(user.id);
      return "🔇 You will no longer be tagged for Life updates!";
    }
  }

  private displayPluginInfo = (): string => {
    return Strings.pluginInfo;
  }

  private displayStatus = (chat: Chat, user: User): string => {
    return this.findOrCreateUser(user.name).status;
  }

  private hustle = (chat: Chat, user: User): string => {
    const lifeUser = this.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
      return lifeUser.occupation.statusMessage(null);
    }

    const multiplier: number = chat.getSetting(HUSTLE_MULTIPLIER_SETTING);

    const successful = Math.random() >= 0.5;

    if (successful) {
      const scoreToGain = Random.number(60, 700) * multiplier;
      const actualScoreGained = chat.alterUserScore(new AlterUserScoreArgs(user, scoreToGain, PLUGIN_NAME, ScoreChangeReason.crimeCommited));
      this.addPoliceBounty(chat, user, scoreToGain);
      return `${lifeUser.mentionedUserName} ${Strings.hustleSuccessful(actualScoreGained)}`;
    } else {
      lifeUser.incarcerate(() => {
        if (!this.lifeChatsData.get(chat.id)?.usersNotTagged.includes(user.id)) {
          this.sendMessage(chat.id, `${lifeUser.mentionedUserName} ${Strings.releasedFromJail}`);
        }
      });
      return `${lifeUser.mentionedUserName} ${lifeUser.occupation.startMessage}`
    }
  }

  private work = (chat: Chat, user: User): string => {
    const lifeUser = this.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
      return lifeUser.occupation.statusMessage(null);
    }

    const multiplier: number = chat.getSetting(WORK_MULTIPLIER_SETTING);

    lifeUser.startWork(() => {
      let scoreToGain = lifeUser.occupation.waitingTime * 20 * multiplier;
      scoreToGain = chat.alterUserScore(new AlterUserScoreArgs(user, scoreToGain, PLUGIN_NAME, ScoreChangeReason.workCompleted));

      if (!this.lifeChatsData.get(chat.id)?.usersNotTagged.includes(user.id)) {
        this.sendMessage(chat.id, `${lifeUser.mentionedUserName} ${Strings.doneWorking(scoreToGain)}`);
      }
    })

    return `${lifeUser.mentionedUserName} ${lifeUser.occupation.startMessage}`;
  }

  /// Helpers

  private createBountiesString(bounties: Bounty[], chat: Chat): string {
    if (bounties.length === 0) {
      return '';
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
        return `${targetUser.name}: ${bounty.bounty} points`;
      })
      .join("\n-\t");
  }

  private addPoliceBounty(chat: Chat, user: User, bounty: number): void {
    const lifeChatData = this.getOrCreateLifeChatsData(chat.id);
    let chatBounty = lifeChatData.bounties.find((chatBounty) => chatBounty.isPoliceBounty && chatBounty.userId === user.id);

    if (!chatBounty) {
      chatBounty = { bounty: bounty, isPoliceBounty: true, userId: user.id };
      lifeChatData.bounties.push(chatBounty);
    } else {
      chatBounty.bounty += bounty;
    }
  }

  private prepareKill(chat: Chat, user: User, match: string) : { errorMsg: string, killCosts: number, targetUser: User } {
    const lifeUser = this.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
      return { errorMsg: lifeUser.occupation.statusMessage(null), killCosts: null, targetUser: null };
    }
    if (!match) {
      return { errorMsg: Strings.killTooFewArgumentsError, killCosts: null, targetUser: null };
    }
    const parameters = match.split(' ');

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
    const targetLifeUser = this.findOrCreateUser(targetUser.name);

    if (targetLifeUser.occupation?.mayInterruptForHospitalisation === false) {
      return { errorMsg: targetLifeUser.occupation.statusMessage(targetLifeUser.username), killCosts: null, targetUser: null };
    }
    const killCosts = Math.round(Math.max(user.score * 0.25 + targetUser.score * 0.25, 100));
    
    if (killCosts > user.score) {
      return { errorMsg: Strings.cantSpendMoreThanYouHave, killCosts: null, targetUser: null };
    }
    return { errorMsg: null, killCosts: killCosts, targetUser: targetUser };
  }

  private getChatUserFromParameter(chat: Chat, parameter: string): User | null {
    const username = parameter.replace('@', '');
    const user = Array.from(chat.users.values()).find((u) => u.name.toLowerCase() === username.toLowerCase());
    return user ?? null;
  }

  private findOrCreateUser(username: string): LifeUser {
    let user = this.lifeUsers.find(u => u.username === username);
    if (!user) {
      this.lifeUsers.push(user = new LifeUser(username));
    }
    return user;
  }

  private getOrCreateLifeChatsData(chatId: number): LifeChatData {
    let lifeChatData = this.lifeChatsData.get(chatId);

    if (!lifeChatData) {
      lifeChatData = { chatId: chatId, usersNotTagged: [], bounties: [] };
      this.lifeChatsData.set(chatId, lifeChatData);
    }
    return lifeChatData;
  }
}