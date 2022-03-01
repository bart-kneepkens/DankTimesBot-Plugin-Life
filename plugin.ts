import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { WageSlaveOccupation, CriminalOccupation } from "./Occupation";
import { LifeUser } from "./LifeUser";
import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Strings } from './Strings';
import { Random } from "./Random";
import TelegramBot from "node-telegram-bot-api";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { EmptyEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/empty-event-arguments";
import { LifeChatData } from "./LifeChatData";

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
}

export enum ScoreChangeReason {
    crimeCommited = `crimeCommitted`,
    workCompleted = `workCompleted`,
    bribe = `bribe`,
    breakoutSucceeded = `breakoutSucceeded`
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
    const lifeCommand = new BotCommand([Commands.life], `Display info about the ${PLUGIN_NAME} plugin`, this.displayPluginInfo, true);
    const statusCommand = new BotCommand([Commands.status], "", this.displayStatus, false);
    const workCommand = new BotCommand([Commands.work], "", this.work, false);
    const crimeCommand = new BotCommand([Commands.crime], "", this.hustle, false);
    const breakoutCommand = new BotCommand([Commands.breakout], "", this.breakOut, false);
    const officeCommand = new BotCommand([Commands.office], "", this.describeOffice, false);
    const prisonCommand = new BotCommand([Commands.prison], "", this.describePrison, false);
    const bribeCommand = new BotCommand([Commands.bribe], "", this.bribe, false);
    const togglelifetagsCommand = new BotCommand([Commands.togglelifetags], "", this.toggleLifeTags, false);
    return [lifeCommand, statusCommand, workCommand, crimeCommand, breakoutCommand, officeCommand, prisonCommand, bribeCommand, togglelifetagsCommand];
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
  
  private breakOut = (chat: Chat, user: User, msg: TelegramBot.Message): string => {
    const lifeUser = this.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
        return lifeUser.occupation.statusMessage;
    }

    if (msg.reply_to_message == null || msg.reply_to_message.from == null) {
        return Strings.breakoutInstructions;
    } else if (msg.reply_to_message.from.id === user.id) {
        return Strings.breakoutYourself;
    }

    const inmate = this.findOrCreateUser(msg.reply_to_message.from.username);

    if(!(inmate.occupation instanceof CriminalOccupation)) {
        return `${lifeUser.mentionedUserName} ${Strings.isNotInPrison(inmate.username)}`;
    }
    
    let successful = Math.random() >= 0.35;

    if (successful) {
        inmate.clearOccupation();
        chat.alterUserScore(new AlterUserScoreArgs(user, 100, PLUGIN_NAME, ScoreChangeReason.breakoutSucceeded));
        return `${lifeUser.mentionedUserName} ${Strings.didBreakOutInmate(inmate.username)}`;
    } else {
        lifeUser.incarcerate(() => {
          this.sendMessage(chat.id, `${lifeUser.mentionedUserName} ${Strings.releasedFromJail}`);
        });
        return `${lifeUser.mentionedUserName} ${Strings.breakoutFailed(lifeUser.occupation.waitingTime)}`
    }
  }

  private bribe = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
    const args = match.split(" ");
    const inmate = this.findOrCreateUser(user.name);

    if(!(inmate.occupation instanceof CriminalOccupation)) {
        return `${inmate.mentionedUserName} ${Strings.youAreNotInPrison}`;
    }

    if (args.length < 1) {
        return Strings.bribeInstruction;
    }
    const amount = Number(args[0]);

    if (isNaN(amount) || amount < 0) {
        return Strings.provideValidPositiveNumber;
    }
    const totalFunds = user.score;

    if (amount > totalFunds) {
        return Strings.cantSpendMoreThanYouHave;
    }

    const chance = (amount / totalFunds);
    const succeeds = Math.random() < (chance * 4.2);

    chat.alterUserScore(new AlterUserScoreArgs(user, -amount, PLUGIN_NAME, ScoreChangeReason.bribe));

    if (succeeds) {
        inmate.clearOccupation();
        return Strings.bribingSuccessful;
    } else {
        return Strings.bribingFailed(amount); 
    }
  }

  private toggleLifeTags = (chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
    let lifeChatData = this.lifeChatsData.get(chat.id);

    if (!lifeChatData) {
      lifeChatData = { chatId: chat.id, usersNotTagged: [] };
      this.lifeChatsData.set(chat.id, lifeChatData);
    }

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
        return lifeUser.occupation.statusMessage;
    }

    const multiplier: number = chat.getSetting(HUSTLE_MULTIPLIER_SETTING);

    const successful = Math.random() >= 0.5;

    if (successful) {
        let scoreToGain = Random.number(60, 700) * multiplier;
        scoreToGain = chat.alterUserScore(new AlterUserScoreArgs(user, scoreToGain, PLUGIN_NAME, ScoreChangeReason.crimeCommited));
        return `${lifeUser.mentionedUserName} ${Strings.hustleSuccessful(scoreToGain)}`;
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
        return lifeUser.occupation.statusMessage;
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

  private findOrCreateUser(username: string): LifeUser {
    let user = this.lifeUsers.find(u => u.username === username);
    if (!user) {
        this.lifeUsers.push(user = new LifeUser(username));
    }
    return user;
  }
}