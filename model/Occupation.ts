import { Strings } from "../Strings";
import { Random } from "../Random";

export abstract class Occupation {

    private readonly endTime: Date;

    constructor(
        public readonly waitingTime: number,
        public readonly mayInterruptForHospitalisation: boolean = true) { 

        this.endTime = new Date(Date.now() + (waitingTime * 60000));
    }

    get remainingTimeMinutes(): number {
        return Math.round((this.endTime.valueOf() - new Date().valueOf()) / 60000);
    }

    protected get timeRemainingAsString(): string {
        const timeRemaining = this.remainingTimeMinutes;
        const minutes = Strings.minutes(timeRemaining);

        return `with ${minutes} to go`;
    }

    abstract get startMessage(): string;

    abstract statusMessage(userName: string | null): string;
}

export class WageSlaveOccupation extends Occupation {

    constructor(minutes: number) {
        super(minutes);
    }

    get startMessage(): string {
        return Strings.startedWorking(this.remainingTimeMinutes);
    }

    statusMessage(userName: string | null): string {
        return `${Strings.currentlyWorking(userName)} ${this.timeRemainingAsString} 🏢`;
    }
}

export class CriminalOccupation extends Occupation {

    constructor(unlawfulKill: boolean) {
        const severity = unlawfulKill ? 25 : 10;
        super(Random.number(severity, severity * 2));
    }

    get startMessage(): string {
        return Strings.thrownInJail(this.remainingTimeMinutes);
    }

    statusMessage(userName: string | null): string {
        return `${Strings.currentlyIncarcerated(userName)} ${this.timeRemainingAsString } 🔒`;
    }
}

export class HospitalisedOccupation extends Occupation {

    constructor(minutes: number) {
        super(minutes, false);
    }

    get startMessage(): string {
        return "";  // Unused.
    }

    statusMessage(userName: string | null): string {
        return `${Strings.currentlyHospitalised(userName)} ${this.timeRemainingAsString } 🏥`;
    }
}
