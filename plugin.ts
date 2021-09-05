import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { WageSlaveOccupation, CriminalOccupation } from "./Occupation";
import { LifeUser } from "./LifeUser";
import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Strings } from './Strings';
import { Random } from "./Random";

const PLUGIN_NAME = "Life";

export enum Commands {
    status = "status",
    work = "work",
    crime = "hustle",
    breakout = "breakout",
    office = "office",
    prison = "prison",
    bribe = "bribe",
}

export enum ScoreChangeReason {
    crimeCommited = `crimeCommitted`,
    workCompleted = `workCompleted`,
    bribe = `bribe`,
    breakoutSucceeded = `breakoutSucceeded`
}

export class Plugin extends AbstractPlugin {

  private lifeUsers: LifeUser[] = [];

  constructor() {
    super(PLUGIN_NAME, "1.1.0");
  }

  /// Override
  public getPluginSpecificCommands(): BotCommand[] {
    const lifeCommand = new BotCommand("life", `Display info about the ${PLUGIN_NAME} plugin`, this.displayPluginInfo, true);
    const statusCommand = new BotCommand("status", "", this.displayStatus, false);
    const workCommand = new BotCommand("work", "", this.work, false);
    const crimeCommand = new BotCommand("hustle", "", this.hustle, false);
    const breakoutCommand = new BotCommand("breakout", "", this.breakOut, false);
    const officeCommand = new BotCommand("office", "", this.describeOffice, false);
    const prisonCommand = new BotCommand("prison", "", this.describePrison, false);
    const bribeCommand = new BotCommand("bribe", "", this.bribe, false);
    return [lifeCommand, statusCommand, workCommand, crimeCommand, breakoutCommand, officeCommand, prisonCommand, bribeCommand];
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
  
  private breakOut = (chat: Chat, user: User, msg: any, match: string[]): string => {
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
        lifeUser.incarcerate();
        return `${lifeUser.mentionedUserName} ${Strings.breakoutFailed(lifeUser.occupation.waitingTime)}`
    }
  }

  private bribe = (chat: Chat, user: User, msg: any): string => {
    const args = msg.text.split(" ");
    const inmate = this.findOrCreateUser(user.name);

    if(!(inmate.occupation instanceof CriminalOccupation)) {
        return `${inmate.mentionedUserName} ${Strings.youAreNotInPrison}`;
    }

    if (args.length < 2) {
        return Strings.bribeInstruction;
    }
    if (isNaN(args[1]) || args[1] < 0) {
        return Strings.provideValidPositiveNumber;
    }
    
    const amount = args[1];
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

    const successful = Math.random() >= 0.5;

    if (successful) {
        const scoreToGain = Random.number(60, 700);
        chat.alterUserScore(new AlterUserScoreArgs(user, scoreToGain, PLUGIN_NAME, ScoreChangeReason.crimeCommited));
        return `${lifeUser.mentionedUserName} ${Strings.hustleSuccessful(scoreToGain)}`;
    } else {
        lifeUser.incarcerate();
        return `${lifeUser.mentionedUserName} ${lifeUser.occupation.startMessage}`
    }
  }
  
  private work = (chat: Chat, user: User): string => {
    const lifeUser = this.findOrCreateUser(user.name);

    if (lifeUser.occupation) {
        return lifeUser.occupation.statusMessage;
    }

    lifeUser.startWork(() => {
        chat.alterUserScore(new AlterUserScoreArgs(user, lifeUser.occupation.waitingTime * 20, PLUGIN_NAME, ScoreChangeReason.workCompleted));
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