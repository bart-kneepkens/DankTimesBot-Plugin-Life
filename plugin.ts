import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { Occupation, WageSlaveOccupation, CriminalOccupation } from "./Occupation";

enum Commands {
    status = "status",
    work = "work",
    crime = "hustle",
    breakout = "breakout",
    office = "office",
    prison = "prison",
}

export class Plugin extends AbstractPlugin {

  private userOccupations: Occupation[] = [];

  constructor() {
    super("Life", "1.0.0");
  }

  /**
   * @override
   */
  public getPluginSpecificCommands(): BotCommand[] {
    const lifeBaseCommand = new BotCommand("life", "control your virtual life. \n - /life work \n - /life hustle \n - /life breakout \n - /life office \n - /life prison", this.lifeRouter.bind(this));
    return [lifeBaseCommand];
  }

  private getSubCommand(msg: any): string {
      return msg.text.split(" ")[1];
  } 

  private getOccupation(username: string): Occupation {
      return this.userOccupations[username] == null ? null : this.userOccupations[username].occupation;
  }

  private getRandomWaitingTime(min: number, max: number): number {
    return ;
  }

  private prefixForUsername(username: String) {
      return "@" + username + ": ";
  }

  private startWorking(user: User, username: string): string {
    const occupation = new WageSlaveOccupation();
    this.userOccupations[username] = { occupation: occupation };

    setTimeout(()=> {
        delete this.userOccupations[username];
        user.addToScore(occupation.waitingTime * 15);
    }, 60000 * occupation.waitingTime);
    return occupation.getStartMessage();
  }

  private commitCrime(user: User, username: string): string {
    const prefix = this.prefixForUsername(username);

    let successful = Math.random() >= 0.5;
    if (successful) {
        const scoreToGain = this.getRandomWaitingTime(2, 5) * 100;
        user.addToScore(scoreToGain);
        return prefix + "You hustled and made  " + scoreToGain + " internet points 💰";
    } else {
        const occupation = new CriminalOccupation();
        this.userOccupations[username] = { occupation: occupation };
        setTimeout(()=> {
            delete this.userOccupations[username];
        }, 60000 * occupation.waitingTime);
        return prefix + occupation.getStartMessage();
      } 
  }

  private breakOut(username: string, inmateUsername: string): string {
    const prefix = this.prefixForUsername(username);

    if(this.userOccupations[inmateUsername] == null) {
        return prefix + " " + inmateUsername + " is not in prison, silly 🤪";
    }
    let successful = Math.random() >= 0.5; 

    if (successful) {
        delete this.userOccupations[inmateUsername];
        return prefix + " Broke out " + inmateUsername + "!";
    } else {
        const occupation = new CriminalOccupation();
        this.userOccupations[username] = { occupation: occupation };
        setTimeout(()=> {
            delete this.userOccupations[username];
        }, 60000 * occupation.waitingTime);
        return prefix + "<b> The breakout failed. </b> Now you're going to prison for " + occupation.waitingTime + " minutes 👮🏻‍ ";
    }
  }

  private explainStatus(occupation: Occupation): string {
    if (occupation) {
        return occupation.getStatusMessage();
    }
    return "You are free to do as you like. Have some Freedom Fries (TM) 🍟 ";
  }

  private listOfficeWorkers(): string {
        const usernames = Object.keys(this.userOccupations).filter(p => this.userOccupations[p].occupation instanceof WageSlaveOccupation);
        if (usernames.length == 0 ) {
            return "It's an empty day at the AFK office..";
        }
        return "🏢 <b> People slaving at the AFK office </b> 🏢  \n-\t" + usernames.join("\n-\t");
  }

  private listPrisonInmates(): string {
    const usernames = Object.keys(this.userOccupations).filter(p => this.userOccupations[p].occupation instanceof WageSlaveOccupation);
    if (usernames.length == 0 ) {
        return "AFK State Penitentiary is completely empty..";
    }
    return "🔒 <b> Inmates at the AFK State Penitentiary </b> 🔒  \n-\t" + usernames.join("\n-\t");
}

  private lifeRouter(chat: Chat, user: User, msg: any, match: string[]): string {
    const occupation = this.getOccupation(msg.from.username);
    const prefix = this.prefixForUsername(msg.from.username);
    const subCommand = this.getSubCommand(msg);

    switch(subCommand) {
        case Commands.status: {
            return prefix + this.explainStatus(occupation);
        }
        case Commands.office: {
            return this.listOfficeWorkers();
        }
        case Commands.prison: {
            return this.listPrisonInmates();
        }
    }

    if (occupation) {
        return prefix + occupation.getBusyMessage();
    }
    
    switch(subCommand) {
        case Commands.work: {
            return prefix + this.startWorking(user, msg.from.username);
        }
        case Commands.crime: {
            return this.commitCrime(user, msg.from.username);
        }
        case Commands.breakout: {
            if (msg.reply_to_message == null || msg.reply_to_message.from == null) {
                return "To break someone out, reply to their message with <code>/life breakout</code> ✋";
            } else if (msg.reply_to_message.from.id === user.id) {
                return "Breaking out yourself? Who are you? Michael Schofield? ✋";
            }
            return this.breakOut(msg.from.username, msg.reply_to_message.from.username);
        }
    }
  }
}
