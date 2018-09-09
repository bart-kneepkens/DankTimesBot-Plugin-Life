import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";

enum Occupations {    
    working,
    prison,
} 

export class Plugin extends AbstractPlugin {

  private static readonly STATUS_CMD = "status";
  private static readonly WORK_CMD = "work";
  private static readonly CRIME_CMD = "crime";

  private static readonly OFFICE_CMD = "office";
  private static readonly PRISON_CMD = "prison";

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
        return prefix + "You hustled and made  " + scoreToGain + " internet points. ";
      } else {
        this.states[username] = { type: Occupations.prison };
        const prisonTime = this.getRandomWaitingTime(10, 20);
        setTimeout(()=> {
            delete this.states[username;
        }, 60000 * prisonTime);
        return prefix + "Yikes. The police 👮🏻‍ got a hold of you. You're in prison for " + prisonTime + " minutes";
      } 
  }

  private listOfficeWorkers(): string {
        const usernames = Object.keys(this.states).filter(p => this.states[p].type == Occupations.working);
        if (usernames.length == 0 ) {
            return "It's an empty day at the AFK office..";
        }
        return "🏢 People slaving at the AFK office: 🏢  \n- " + usernames.join("\n- ");
  }

  private listPrisonInmates(): string {
    const usernames = Object.keys(this.states).filter(p => this.states[p].type == Occupations.prison);
    if (usernames.length == 0 ) {
        return "AFK State Penitentiary is completely empty..";
    }
    return "🔒 Inmates at the AFK State Penitentiary: 🔒  \n- " + usernames.join("\n- ");
}

  private lifeRouter(chat: Chat, user: User, msg: any, match: string[]): string {
    const occupation = this.getOccupation(msg.from.username);
    const prefix = "@" + msg.from.username + " : ";
    
    if (this.getSubCommand(msg) == Plugin.STATUS_CMD) {
        switch (occupation) {
            case Occupations.working: return prefix + "You are currently working.";
            case Occupations.prison: return prefix + "You are currently behind bars.";
            case null: return prefix + "You are free to do as you like";
        }
    } else if (this.getSubCommand(msg) == Plugin.OFFICE_CMD) {
        return this.listOfficeWorkers();
    } else if (this.getSubCommand(msg) == Plugin.PRISON_CMD) {
        return this.listPrisonInmates();
    } 

    if (occupation == Occupations.working) {
        return prefix + "You are not done 'working' yet.";
    } else if (occupation == Occupations.prison) {
        return prefix + "You are still in prison. Get someone to break you out."; 
    }
    
    switch(this.getSubCommand(msg)) {
        case Plugin.WORK_CMD: {
            const minutesWorking = this.startWorking(user, msg.from.username);
            return prefix + "You started working. You'll get paid in " + minutesWorking + " minutes. ";
        }
        case Plugin.CRIME_CMD: {
            return this.commitCrime(user, msg.from.username);
        }
    }
  }
}