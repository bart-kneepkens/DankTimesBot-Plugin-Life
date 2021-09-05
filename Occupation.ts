import { Strings } from "./Strings";
import { Random } from "./Random";

export abstract class Occupation {

    public waitingTime: number;
    private endTime: Date;

    constructor(minTime: number, maxTime: number) {
        this.waitingTime = Random.number(minTime, maxTime);
        this.endTime = new Date(Date.now() + (this.waitingTime * 60000));
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

    abstract get statusMessage(): string;
}

export class WageSlaveOccupation extends Occupation {

    constructor() {
        super(2, 10);
    }

    get startMessage(): string {
        return Strings.startedWorking(this.remainingTimeMinutes);
    }

    get statusMessage(): string {
        return `${Strings.currentlyWorking} ${this.timeRemainingAsString} 🏢`;
    }
}

export class CriminalOccupation extends Occupation {

    constructor() {
        super(10, 20);
    }

    get startMessage(): string {
        return Strings.thrownInJail(this.remainingTimeMinutes);
    }

    get statusMessage(): string {
        return `${Strings.currentlyIncarcerated} ${this.timeRemainingAsString } 🔒`;
    }
}
