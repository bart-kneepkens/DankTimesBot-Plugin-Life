import { Occupation, WageSlaveOccupation, CriminalOccupation } from "./Occupation";
import { Strings } from "./Strings";

export class LifeUser {

    public occupation: Occupation = null;

    constructor(public username: string) { }

    get mentionedUserName(): string {
        return "@" + this.username + ":";
    }

    get buildingEntry(): string {
        if (this.occupation) {
            const minutes = Strings.minutes(this.occupation.remainingTimeMinutes);
            return `${this.username} (${minutes})`;
        }
        return "";
    }

    get status(): string {
        if (this.occupation) {
            return `${this.mentionedUserName} ${this.occupation.statusMessage}`;
        }
        return Strings.youAreFree;
    }

    startWork = (completion: (() => void)) => {
        this.occupation = new WageSlaveOccupation();
        this.setTimerForOccupation(60000 * this.occupation.waitingTime, completion);
    }

    incarcerate = () => {
        this.occupation = new CriminalOccupation();
        this.setTimerForOccupation(60000 * this.occupation.waitingTime);
    }

    clearOccupation = () => {
        this.occupation = null;
    }

    private setTimerForOccupation(waitingTime: number, completion?: (() => void)) {
        setTimeout(() => {
            completion && completion();
            this.clearOccupation();
        }, waitingTime);
    }
}
