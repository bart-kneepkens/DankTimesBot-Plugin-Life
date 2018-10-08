import { Occupation, WageSlaveOccupation, CriminalOccupation } from "./Occupation";
import { Commands } from "./plugin";
import { User } from "../../src/chat/user/user";

export class LifeUser {

    public occupation: Occupation = null;

    constructor(public username: string) {}

    getBuildingEntry(): string {
        if (this.occupation) {
            return this.username + " (" + this.occupation.getTimeRemaining() + " min)";
        }
        return "";
    }

    prefixForUsername() {
        return "@" + this.username + ": ";
    }

    explainStatus(): string {
      if (this.occupation) {
          return this.prefixForUsername() + this.occupation.getStatusMessage();
      }
      return "You are free to do as you like. Have some Freedom Fries (TM) 🍟 ";
    }

    getBusyMessage(): string {
        return this.prefixForUsername() + this.occupation.getBusyMessage();
    }

    startWorking(user: User): string {
        this.occupation = new WageSlaveOccupation();
        this.setTimerForOccupation(60000 * this.occupation.waitingTime, user, this.occupation.waitingTime * 15);
        return this.prefixForUsername() + this.occupation.getStartMessage();
    }
  
    commitCrime(user: User): string {
      let successful = Math.random() >= 0.5;
      if (successful) {
          const scoreToGain = this.getRandomWaitingTime(2, 5) * 100;
          user.addToScore(scoreToGain);
          return this.prefixForUsername() + "You hustled and made " + scoreToGain + " internet points 💰";
      } else {
          this.occupation = new CriminalOccupation();
          this.setTimerForOccupation(60000 * this.occupation.waitingTime);
          return this.prefixForUsername() + this.occupation.getStartMessage();
        } 
    }
    
    breakOut(): boolean {
        let successful = Math.random() >= 0.5; 
    
        if (successful) {
            return true;
        } else {
            this.occupation = new CriminalOccupation();
            this.setTimerForOccupation(60000 * this.occupation.waitingTime);
            return false;
        }
    }

    isBrokenOut(): string {
        this.occupation = null;
        return "Broke out " + this.username + "!";
    }

    private setTimerForOccupation(waitingTime: number, user?: User, reward?: number) {
        setTimeout(()=> {
            if (user && reward) {
                user.addToScore(reward);
            }
            this.occupation = null;
        }, waitingTime);
    }

    private getRandomWaitingTime(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
