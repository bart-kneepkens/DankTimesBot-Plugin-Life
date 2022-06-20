import { Occupation, WageSlaveOccupation, CriminalOccupation, HospitalisedOccupation } from "./Occupation";
import { Strings } from "../Strings";

export class LifeUser {

    public occupation: Occupation | null = null;

    private timeOut: NodeJS.Timeout | null = null;

    constructor(public username: string) { }

    get mentionedUserName(): string {
        return "@" + this.username;
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
            return `${this.mentionedUserName} ${this.occupation.statusMessage(null)}`;
        }
        return Strings.youAreFree;
    }

    startWork (minutes: number, completion: (() => void)) {
        this.clearOccupation();
        this.occupation = new WageSlaveOccupation(minutes);
        this.setTimerForOccupation(completion);
    }

    incarcerate (completion: (() => void)) {
        this.clearOccupation();
        this.occupation = new CriminalOccupation();
        this.setTimerForOccupation(completion);
    }

    hospitalise (minutes: number, completion: (() => void)) {
        this.clearOccupation();
        this.occupation = new HospitalisedOccupation(minutes);
        this.setTimerForOccupation(completion);
    }

    clearOccupation () {
        if (this.timeOut) {
            clearTimeout(this.timeOut);
            this.timeOut = null;
        }
        this.occupation = null;
    }

    private setTimerForOccupation(completion?: (() => void)) {
        this.timeOut = setTimeout(() => {
            completion && completion();
            this.clearOccupation();
        }, 60000 * (this.occupation?.waitingTime ?? 1));
    }
}
