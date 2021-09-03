import { Occupation, WageSlaveOccupation, CriminalOccupation } from "./Occupation";
import { User } from "../../src/chat/user/user";

export class LifeUser {

    public occupation: Occupation = null;

    constructor(public username: string) { }

    getBuildingEntry = (): string => {
        if (this.occupation) {
            return this.username + " (" + this.occupation.getTimeRemaining() + " min)";
        }
        return "";
    }

    prefixForUsername = () => {
        return "@" + this.username + ": ";
    }

    explainStatus = (): string => {
        if (this.occupation) {
            return this.prefixForUsername() + this.occupation.getStatusMessage();
        }
        return "You are free to do as you like. Have some Freedom Fries (TM) 🍟 ";
    }

    getBusyMessage = (): string => {
        return this.prefixForUsername() + this.occupation.getBusyMessage();
    }

    startWorking = (user: User): string => {
        this.occupation = new WageSlaveOccupation();
        this.setTimerForOccupation(60000 * this.occupation.waitingTime, user, this.occupation.waitingTime * 15);
        return this.prefixForUsername() + this.occupation.getStartMessage();
    }

    commitCrime = (user: User): string => {
        let successful = Math.random() >= 0.5;
        if (successful) {
            const scoreToGain = this.randomNumber(1, 5) * this.randomNumber(60, 140);
            user.addToScore(scoreToGain);
            return this.prefixForUsername() + "You hustled and made " + scoreToGain + " internet points 💰";
        } else {
            this.occupation = new CriminalOccupation();
            this.setTimerForOccupation(60000 * this.occupation.waitingTime);
            return this.prefixForUsername() + this.occupation.getStartMessage();
        }
    }

    breakOut = (botUser: User): boolean => {
        let successful = Math.random() >= 0.35;

        if (successful) {
            botUser.addToScore(100);
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
        setTimeout(() => {
            if (user && reward) {
                user.addToScore(reward);
            }
            this.occupation = null;
        }, waitingTime);
    }

    private randomNumber(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
