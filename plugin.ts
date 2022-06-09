import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { WageSlaveOccupation, CriminalOccupation, HospitalisedOccupation } from "./model/Occupation";
import { LifeUser } from "./model/LifeUser";
import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Strings } from './Strings';
import { Random } from "./Random";
import TelegramBot from "node-telegram-bot-api";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { EmptyEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/empty-event-arguments";
import { LifeChatData } from "./model/LifeChatData";
import { BotCommandConfirmationQuestion } from "../../src/bot-commands/bot-command-confirmation-question";
import { PluginHelperFunctions } from "./plugin-helper-functions";
import { Commands } from "./model/Commands";
import { ScoreChangeReason } from "./model/ScoreChangeReason";

export class Plugin extends AbstractPlugin {

  private static readonly LIFE_CHATS_DATA_FILE = "life-chats-data.json";

  private readonly lifeChatsData: Map<number, LifeChatData> = new Map();
  private readonly lifeUsers: LifeUser[] = [];
  private readonly helper: PluginHelperFunctions;

  constructor() {
    super(Strings.PLUGIN_NAME, "1.3.0-alpha");
    this.subscribeToPluginEvent(PluginEvent.BotStartup, this.onBotStartup.bind(this));
    this.subscribeToPluginEvent(PluginEvent.BotShutdown, () => this.saveDataToFile(Plugin.LIFE_CHATS_DATA_FILE, this.lifeChatsData));
    this.helper = new PluginHelperFunctions(this.lifeChatsData, this.lifeUsers);
  }

  /// Override
  public getPluginSpecificCommands(): BotCommand[] {
    const lifeCommand = new BotCommand([Commands.life], `Display info about the ${Strings.PLUGIN_NAME} plugin`, this.displayPluginInfo.bind(this), true);
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
      new ChatSettingTemplate(Strings.WORK_MULTIPLIER_SETTING, "work reward multiplier", 1, (original) => Number(original), (value) => null),
      new ChatSettingTemplate(Strings.HUSTLE_MULTIPLIER_SETTING, "hustle reward multiplier", 1, (original) => Number(original), (value) => null),
      new ChatSettingTemplate(Strings.KILL_COST_PERCENTAGE_SETTING, "percentage of victim's points required to kill", 10, (original) => Number(original), (value) => null),
      new ChatSettingTemplate(Strings.KILL_COST_BOUNTY_MULTIPLIER_SETTING, "multiplier of killer's bounty required to kill", 1, (original) => Number(original), (value) => null),
      new ChatSettingTemplate(Strings.HOSPITAL_DURATION_MINUTES_SETTING, "duration in minutes player stays in hospital after 'killed'", 60 * 8, (original) => Number(original), (value) => null),
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
    const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);

    if (lifeChatData.bounties.length == 0) {
      return 'There are no active bounties..';
    }
    const policeBounties = lifeChatData.bounties.filter((bounty) => bounty.isPoliceBounty);
    const playerBounties = lifeChatData.bounties.filter((bounty) => !bounty.isPoliceBounty);

    const policeBountiesStr = this.helper.createBountiesString(policeBounties, chat);
    const playerBountiesStr = this.helper.createBountiesString(playerBounties, chat);
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
    const targetUser = this.helper.getChatUserFromParameter(chat, parameters[0]);

    if (targetUser === null) {
      return Strings.userDoesNotExist;
    }
    let bounty = this.parseScoreInput(parameters[1]);

    if (bounty === null || bounty < 1 || bounty % 1 !== 0) {
      return Strings.provideValidPositiveNumber;
    }
    if (user.score < bounty) {
      return Strings.cantSpendMoreThanYouHave(bounty);
    }
    const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);
    let chatBounty = lifeChatData.bounties.find((chatBounty) => !chatBounty.isPoliceBounty && chatBounty.userId === targetUser.id);

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
    question.confirmationQuestionText = `💀 Making an attempt on ${preparation.targetUser.name}'s life will cost ${preparation.killCosts} points. Type 'yes' to confirm.`;
    
    question.actionOnConfirm = () => {
      const preparation = this.helper.prepareKill(chat, user, match);

      if (preparation.errorMsg) {
        return preparation.errorMsg;
      }
      chat.alterUserScore(new AlterUserScoreArgs(user, -preparation.killCosts, Strings.PLUGIN_NAME, ScoreChangeReason.killPlayer));
      const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);
      const bounties = lifeChatData.bounties.filter((bounty) => bounty.userId === preparation.targetUser.id);
      const targetLifeUser = this.helper.findOrCreateUser(preparation.targetUser.name);
      const lifeUser = this.helper.findOrCreateUser(user.name);

      if (Random.number(0, 100) >= 40) {   
        targetLifeUser.hospitalise(chat.getSetting<number>(Strings.HOSPITAL_DURATION_MINUTES_SETTING), () => {
          if (!lifeChatData.usersNotTagged.includes(preparation.targetUser.id)) {
            this.sendMessage(chat.id, `${targetLifeUser.mentionedUserName} ${Strings.releasedFromHospital}`);
          }
        });

        let bountyReward = bounties.map((bounty) => bounty.bounty).reduce((sum, current) => sum + current, 0);
        bountyReward = chat.alterUserScore(new AlterUserScoreArgs(user, bountyReward, Strings.PLUGIN_NAME, ScoreChangeReason.receivedBounty));

        if (!bounties.find((bounty) => bounty.isPoliceBounty)) {
          const bountyForUnlawfulKilling = 700 * chat.getSetting<number>(Strings.HUSTLE_MULTIPLIER_SETTING);
          this.helper.addPoliceBounty(chat, user, bountyForUnlawfulKilling);
        }
        bounties.forEach((bounty) => lifeChatData.bounties.splice(lifeChatData.bounties.indexOf(bounty), 1));
        return `💀 @${user.name} has mortally wounded ${targetLifeUser.mentionedUserName} and claimed a ${bountyReward} points bounty!`;

      } else if (!bounties.find((bounty) => bounty.isPoliceBounty)) {
        const bountyForUnlawfulKillingAttempt = 350 * chat.getSetting<number>(Strings.HUSTLE_MULTIPLIER_SETTING);
        this.helper.addPoliceBounty(chat, user, bountyForUnlawfulKillingAttempt);

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
    const lifeUser = this.helper.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
      return lifeUser.occupation.statusMessage(null);
    }

    if (msg.reply_to_message == null || msg.reply_to_message.from == null) {
      return Strings.breakoutInstructions;
    } else if (msg.reply_to_message.from.id === user.id) {
      return Strings.breakoutYourself;
    }

    const inmate = this.helper.findOrCreateUser(msg.reply_to_message.from.username);

    if (!(inmate.occupation instanceof CriminalOccupation)) {
      return `${lifeUser.mentionedUserName} ${Strings.isNotInPrison(inmate.username)}`;
    }

    let successful = Math.random() >= 0.35;

    if (successful) {
      inmate.clearOccupation();
      const scoreGained = 230 * chat.getSetting<number>(Strings.HUSTLE_MULTIPLIER_SETTING);
      chat.alterUserScore(new AlterUserScoreArgs(user, scoreGained, Strings.PLUGIN_NAME, ScoreChangeReason.breakoutSucceeded));

      this.helper.addPoliceBounty(chat, user, scoreGained);
      const freedUser = chat.getOrCreateUser(msg.reply_to_message.from.id);
      this.helper.addPoliceBounty(chat, freedUser, scoreGained);

      return `${lifeUser.mentionedUserName} ${Strings.didBreakOutInmate(inmate.username)}`;
    } else {
      lifeUser.incarcerate(() => {
        const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);

        if (!lifeChatData.usersNotTagged.includes(user.id)) {
          this.sendMessage(chat.id, `${lifeUser.mentionedUserName} ${Strings.releasedFromJail}`);
        }
      });
      return `${lifeUser.mentionedUserName} ${Strings.breakoutFailed(lifeUser.occupation.waitingTime)}`;
    }
  }

  private bribe = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
    const args = match.split(" ");
    const inmate = this.helper.findOrCreateUser(user.name);

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
    const chance = (amount / totalFunds);
    const succeeds = Math.random() < (chance * 4.2);
    const actualBribedAmount = chat.alterUserScore(new AlterUserScoreArgs(user, -amount, Strings.PLUGIN_NAME, ScoreChangeReason.bribe));

    if (succeeds) {
      inmate.clearOccupation();
      this.helper.addPoliceBounty(chat, user, amount);
      return Strings.bribingSuccessful;
    } else {
      return Strings.bribingFailed(actualBribedAmount);
    }
  }

  private toggleLifeTags = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
    const lifeChatData = this.helper.getOrCreateLifeChatsData(chat.id);

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
    return this.helper.findOrCreateUser(user.name).status;
  }

  private hustle = (chat: Chat, user: User): string => {
    const lifeUser = this.helper.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
      return lifeUser.occupation.statusMessage(null);
    }

    const multiplier: number = chat.getSetting(Strings.HUSTLE_MULTIPLIER_SETTING);

    const successful = Math.random() >= 0.5;

    if (successful) {
      const scoreToGain = Random.number(60, 700) * multiplier;
      const actualScoreGained = chat.alterUserScore(new AlterUserScoreArgs(user, scoreToGain, Strings.PLUGIN_NAME, ScoreChangeReason.crimeCommited));
      this.helper.addPoliceBounty(chat, user, scoreToGain);
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
    const lifeUser = this.helper.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
      return lifeUser.occupation.statusMessage(null);
    }

    const multiplier: number = chat.getSetting(Strings.WORK_MULTIPLIER_SETTING);

    lifeUser.startWork(() => {
      let scoreToGain = lifeUser.occupation.waitingTime * 20 * multiplier;
      scoreToGain = chat.alterUserScore(new AlterUserScoreArgs(user, scoreToGain, Strings.PLUGIN_NAME, ScoreChangeReason.workCompleted));

      if (!this.lifeChatsData.get(chat.id)?.usersNotTagged.includes(user.id)) {
        this.sendMessage(chat.id, `${lifeUser.mentionedUserName} ${Strings.doneWorking(scoreToGain)}`);
      }
    })

    return `${lifeUser.mentionedUserName} ${lifeUser.occupation.startMessage}`;
  }
}