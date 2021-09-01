import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { Occupation, WageSlaveOccupation, CriminalOccupation } from "./Occupation";
import { LifeUser } from "./LifeUser";
import { UserScoreChangedPluginEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/user-score-changed-plugin-event-arguments";

export enum Commands {
    status = "status",
    work = "work",
    crime = "hustle",
    breakout = "breakout",
    office = "office",
    prison = "prison",
    bribe = "bribe",
}

export class Plugin extends AbstractPlugin {

  private lifeUsers: LifeUser[] = [];

  constructor() {
    super("Life", "1.0.0");
  }

  /**
   * @override
   */
  public getPluginSpecificCommands(): BotCommand[] {
    const statusCommand = new BotCommand("status", "show life status", this.lifeRouter.bind(this));
    const workCommand = new BotCommand("work", "Make money the honest way", this.lifeRouter.bind(this));
    const crimeCommand = new BotCommand("hustle", "Make money the not so honest way", this.lifeRouter.bind(this));
    const breakoutCommand = new BotCommand("breakout", "Break a fellow player out of prison", this.lifeRouter.bind(this));
    const officeCommand = new BotCommand("office", "List players that are currently working at the office", this.lifeRouter.bind(this));
    const prisonCommand = new BotCommand("prison", "List players that are currently in prison", this.lifeRouter.bind(this));
    const bribeCommand = new BotCommand("bribe", "Bribe a prison guard to let you out", this.lifeRouter.bind(this));
    return [statusCommand, workCommand, crimeCommand, breakoutCommand, officeCommand, prisonCommand, bribeCommand];
  }

  private findOrCreateUser(username: string): LifeUser {
    let user = this.lifeUsers.find(u => u.username === username);
    if (!user) {
        this.lifeUsers.push(user = new LifeUser(username));
    }
    return user;
  }

  private listOfficeWorkers(): string {
        const entries = this.lifeUsers.filter(u => u.occupation instanceof WageSlaveOccupation).map(u => u.getBuildingEntry());
        if (entries.length == 0 ) {
            return "It's an empty day at the AFK office..";
        }
        return "🏢 <b> People slaving at the AFK office </b> 🏢  \n-\t" + entries.join("\n-\t");
  }

  private listPrisonInmates(): string {
    const entries = this.lifeUsers.filter(u => u.occupation instanceof CriminalOccupation).map(u => u.getBuildingEntry());
    if (entries.length == 0 ) {
        return "AFK State Penitentiary is completely empty..";
    }
    return "🔒 <b> Inmates at the AFK State Penitentiary </b> 🔒  \n-\t" + entries.join("\n-\t");
  }
  
  private breakOut(lifeUser: LifeUser, inmateUsername: string, botUser: User): string {
    const inmate = this.findOrCreateUser(inmateUsername);

    if(!(inmate.occupation instanceof CriminalOccupation)) {
        return lifeUser.prefixForUsername() + " " + inmateUsername + " is not in prison, silly 🤪";
    }
    
    if (lifeUser.breakOut(botUser)) {
        return lifeUser.prefixForUsername() + inmate.isBrokenOut() + " Here's a reward!"
    } else {
        return lifeUser.prefixForUsername() + "<b> The breakout failed. </b> Now you're going to prison for " + lifeUser.occupation.waitingTime + " minutes 👮🏻‍ "
    }
  }

  private bribe = (user: User, msg: any): string => {
    const args = msg.text.split(" ");
    const inmate = this.findOrCreateUser(user.name);

    if(!(inmate.occupation instanceof CriminalOccupation)) {
        return inmate.prefixForUsername() + "you are not in prison, silly 🤪";
    }

    if (args.length < 2) {
        return 'Provide argument [amount] - the amount of points you\'re willing to use to bribe the prison guards';
    }
    if (isNaN(args[1])) {
        return 'Provide a number please.';
    }
    
    const amount = args[1];
    const totalFunds = user.score;

    if (amount > totalFunds) {
        return 'You can\'t spend more than you have on bribing.'
    }

    const chance = (amount / totalFunds);
    const succeeds = Math.random() < (chance * 1.0337);

    user.addToScore(-amount);

    if (succeeds) {
        inmate.occupation = null;
        return "👮🏻‍♂️ Your bribing attempt was successful. You are released from prison.";
    } else {
        return "👮🏻‍♂️ Your bribing attempt was failed! You've lost your funds! 😭"
    }
  }

  private lifeRouter(chat: Chat, user: User, msg: any, match: string[]): string {
    const senderUser = this.findOrCreateUser(msg.from.username);
    const command = msg.text.substring(1).split(" ")[0];

    switch(command) {
        case Commands.status: {
            return senderUser.explainStatus();
        }
        case Commands.office: {
            return this.listOfficeWorkers();
        }
        case Commands.prison: {
            return this.listPrisonInmates();
        }
        case Commands.bribe: {
            return this.bribe(user, msg);
        }
    }

    if (senderUser.occupation) {
        return senderUser.getBusyMessage();
    }
    
    switch(command) {
        case Commands.work: {
            return senderUser.startWorking(user);
        }
        case Commands.crime: {
            return senderUser.commitCrime(user);
        }
        case Commands.breakout: {
            if (msg.reply_to_message == null || msg.reply_to_message.from == null) {
                return "To break someone out, reply to their message with <code>/breakout</code> ✋";
            } else if (msg.reply_to_message.from.id === user.id) {
                return "Breaking out yourself? ✋";
            }
            return this.breakOut(senderUser, msg.reply_to_message.from.username, user);
        }
    }
  }
}
