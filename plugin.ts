import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";

enum Occupations {    
    working,
    prison,
} 

enum Commands {
    status = "status",
    work = "work",
    crime = "hustle",
    breakout = "breakout",
    office = "office",
    prison = "prison",
}

export class Plugin extends AbstractPlugin {

  private states: { [key:string] : {type: Occupations; }} = {}

  constructor() {
    super("Life", "1.0.0");
  }

  /**
   * @override
   */
  public getPluginSpecificCommands(): BotCommand[] {
    const lifeBaseCommand = new BotCommand("life", "control your virtual life", this.lifeRouter.bind(this));
    return [lifeBaseCommand];
  }

  private getSubCommand(msg: any): string {
      return msg.text.split(" ")[1];
  } 

  private getOccupation(username: string): Occupations {
      if (this.states[username] == null) {
        return null;
      }
      return this.states[username].type;
  }

  private getRandomWaitingTime(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private startWorking(user: User, username: string): number {
    const waitingTime = this.getRandomWaitingTime(2, 10);
    this.states[username] = { type: Occupations.working };

    setTimeout(()=> {
        delete this.states[username];
        user.addToScore(waitingTime * 15);
    }, 60000 * waitingTime);
    return waitingTime;
  }

  private commitCrime(user: User, username: string): string {
    const waitingTime = this.getRandomWaitingTime(2, 5);
    const prefix = "@" + username + " : ";

    let successful = Math.random() >= 0.5;
    // Second chance for lowlife thugs
      if (user.score < 1000 && !successful) {
        successful = Math.random() >= 0.4;
      }
      
      if (successful) {
        const scoreToGain = waitingTime * 100;
        user.addToScore(scoreToGain);
        return prefix + "You hustled and made  " + scoreToGain + " internet points 💰";
      } else {
        this.states[username] = { type: Occupations.prison };
        const prisonTime = this.getRandomWaitingTime(10, 20);
        setTimeout(()=> {
            delete this.states[username];
        }, 60000 * prisonTime);
        return prefix + "<b> The police got a hold of you.</b> You're going to prison for " + prisonTime + " minutes👮🏻‍ ";
      } 
  }

  private breakOut(username: string, inmateUsername: string): string {
    const prefix = "@" + username + " : ";

    if(this.states[inmateUsername] == null) {
        return prefix + " " + inmateUsername + " is not in prison, silly 🤪";
    }
    let successful = Math.random() >= 0.5; 

    if (successful) {
        delete this.states[inmateUsername];
        return prefix + " Broke out " + inmateUsername + "!";
    } else {
        this.states[username] = { type: Occupations.prison };
        const prisonTime = this.getRandomWaitingTime(10, 20);
        setTimeout(()=> {
            delete this.states[username];
        }, 60000 * prisonTime);
        return prefix + "<b> The breakout failed. </b> Now you're going to prison for " + prisonTime + " minutes 👮🏻‍ ";
    }
  }

  private explainStatus(occupation: Occupations): string {
    switch (occupation) {
        case Occupations.working: return "You are currently working 🏢 ";
        case Occupations.prison: return "You are currently locked up with an increasingly sexually frustrated cellmate 🔒 ";
    }
    return "You are free to do as you like. Have some Freedom Fries (TM) 🍟 ";
  }

  private listOfficeWorkers(): string {
        const usernames = Object.keys(this.states).filter(p => this.states[p].type == Occupations.working);
        if (usernames.length == 0 ) {
            return "It's an empty day at the AFK office..";
        }
        return "🏢 <b> People slaving at the AFK office </b> 🏢  \n-\t" + usernames.join("\n-\t");
  }

  private listPrisonInmates(): string {
    const usernames = Object.keys(this.states).filter(p => this.states[p].type == Occupations.prison);
    if (usernames.length == 0 ) {
        return "AFK State Penitentiary is completely empty..";
    }
    return "🔒 <b> Inmates at the AFK State Penitentiary </b> 🔒  \n-\t" + usernames.join("\n-\t");
}

  private lifeRouter(chat: Chat, user: User, msg: any, match: string[]): string {
    const occupation = this.getOccupation(msg.from.username);
    const prefix = "@" + msg.from.username + " : ";
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

    if (occupation == Occupations.working) {
        return prefix + "You are not done 'working' yet.";
    } else if (occupation == Occupations.prison) {
        return prefix + "You can't do anything while you're in prison."; 
    }
    
    switch(subCommand) {
        case Commands.work: {
            const minutesWorking = this.startWorking(user, msg.from.username);
            return prefix + "You started working. You'll get paid in " + minutesWorking + " minutes. ";
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