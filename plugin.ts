import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { WageSlaveOccupation, CriminalOccupation } from "./Occupation";
import { LifeUser } from "./LifeUser";

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

  public getPluginSpecificCommands(): BotCommand[] {
    const lifeCommand = new BotCommand("life", "Display info about the Life plugin", this.displayPluginInfo, true);
    const statusCommand = new BotCommand("status", "", this.displayStatus, false);
    const workCommand = new BotCommand("work", "", this.lifeRouter.bind(this), false);
    const crimeCommand = new BotCommand("hustle", "", this.lifeRouter.bind(this), false);
    const breakoutCommand = new BotCommand("breakout", "", this.lifeRouter.bind(this), false);
    const officeCommand = new BotCommand("office", "", this.describeOffice, false);
    const prisonCommand = new BotCommand("prison", "", this.describePrison, false);
    const bribeCommand = new BotCommand("bribe", "", this.bribe, false);
    return [lifeCommand, statusCommand, workCommand, crimeCommand, breakoutCommand, officeCommand, prisonCommand, bribeCommand];
  }

  private findOrCreateUser(username: string): LifeUser {
    let user = this.lifeUsers.find(u => u.username === username);
    if (!user) {
        this.lifeUsers.push(user = new LifeUser(username));
    }
    return user;
  }

  private describeOffice = (): string => {
        const entries = this.lifeUsers.filter(u => u.occupation instanceof WageSlaveOccupation).map(u => u.getBuildingEntry());
        if (entries.length == 0 ) {
            return "It's an empty day at the AFK office..";
        }
        return "🏢 <b> People slaving at the AFK office </b> 🏢  \n-\t" + entries.join("\n-\t");
  }

  private describePrison = (): string => {
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

  private bribe = (chat: Chat, user: User, msg: any): string => {
    const args = msg.text.split(" ");
    const inmate = this.findOrCreateUser(user.name);

    if(!(inmate.occupation instanceof CriminalOccupation)) {
        return inmate.prefixForUsername() + "you are not in prison, silly 🤪";
    }

    if (args.length < 2) {
        return 'Provide argument [amount] - the amount of points you\'re willing to use to bribe the prison guards';
    }
    if (isNaN(args[1]) || args[1] < 0) {
        return 'Provide a valid, positive number please.';
    }
    
    const amount = args[1];
    const totalFunds = user.score;

    if (amount > totalFunds) {
        return 'You can\'t spend more than you have on bribing.'
    }

    const chance = (amount / totalFunds);
    const succeeds = Math.random() < (chance * 4.2);

    user.addToScore(-amount);

    if (succeeds) {
        inmate.occupation = null;
        return "👮🏻‍♂️ Your bribing attempt was successful. You are released from prison.";
    } else {
        const points = new Points(amount);
        return `👮🏻‍♂️ Your bribing attempt has failed! You've lost ${points.stringValue}! 😭`
    }
  }

  private displayPluginInfo = (): string => {
      return "🍋 Life - Choose your destiny 🍋 \n\n"
      + `/${Commands.status} - To see how life is looking for you\n`
      + `/${Commands.work} - To earn money the safe (and boring) way\n`
      + `/${Commands.crime} - To earn money the gangster way - you may end up in prison!\n\n` 
      + `/${Commands.prison} - See who's locked up in prison\n`
      + `/${Commands.office} - See who's in the office\n\n`
      + `/${Commands.breakout} - Reply this to a prison inmate to attempt to break them out\n`
      + `/${Commands.bribe} - Attempt to buy your way to freedom - provide an amount of money you're willing to spend!\n`;
  }

  private displayStatus = (chat: Chat, user: User): string => {
      return this.findOrCreateUser(user.name).explainStatus();
  }


  private lifeRouter(chat: Chat, user: User, msg: any, match: string[]): string {
    const senderUser = this.findOrCreateUser(msg.from.username);
    const command = msg.text.substring(1).split(" ")[0].split("@")[0];

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

export class Minutes {
    private value: number;

    constructor(minutes: number) {
        this.value = minutes;
    }

    public get stringValue(): string {
        if (this.value < 1) {
            return `less than a minute`
        } else if (Math.abs(this.value) == 1) {
            return `${this.value} minute`;
        } 
        return `${this.value} minutes`
    }
}

export class Points {
    private value: number;

    constructor(points: number) {
        this.value = points;
    }

    public get stringValue(): string {
        if (Math.abs(this.value) == 1) {
            return `${this.value} point`;
        }
        return `${this.value} points`
    }
}