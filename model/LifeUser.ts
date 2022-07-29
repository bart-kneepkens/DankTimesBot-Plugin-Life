import { Occupation, WageSlaveOccupation, CriminalOccupation, HospitalisedOccupation, GoodSamaritanOccupation } from "./Occupation";
import { Strings } from "../Strings";
import { User } from "../../../src/chat/user/user";

export class LifeUser {

    public occupation: Occupation | null = null;

    private timeOut: NodeJS.Timeout | null = null;

    constructor(public user: User) { }

    get mentionedUserName(): string {
        return "@" + this.user.name;
    }

    get buildingEntry(): string {
        if (this.occupation) {
            const minutes = Strings.minutes(this.occupation.remainingTimeMinutes);
            const avatar = this.user.currentAvatar ? `${this.user.currentAvatar}  ` : "";
            return `${avatar}${this.user.name} (${minutes})`;
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

    startCommunityService (minutes: number, completion: (() => void)) {
        this.clearOccupation();
        this.occupation = new GoodSamaritanOccupation(minutes);
        this.setTimerForOccupation(completion);
    }
}
