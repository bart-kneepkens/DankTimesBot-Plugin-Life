import { Minutes } from "./plugin";

export abstract class Occupation {

    public waitingTime: number;
    private endTime: Date;

    constructor(minTime: number, maxTime: number) {
        this.waitingTime = this.getRandomWaitingTime(minTime, maxTime);
        this.endTime = new Date(Date.now() + (this.waitingTime * 60000));
    }

    getRemainingTimeMinutes(): number {
        return Math.round((this.endTime.valueOf() - new Date().valueOf()) / 60000);
    }

    protected getTimeRemainingAsString(): string {
        const timeRemaining = this.getRemainingTimeMinutes();
        const minutes = new Minutes(timeRemaining);

        return `with ${minutes.stringValue} to go`;
    }

    abstract getStartMessage(): string;

    abstract getStatusMessage(): string;
    
    abstract getBusyMessage(): string;

    private getRandomWaitingTime(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

export class WageSlaveOccupation extends Occupation {

    constructor() {
        super(2, 10);
    }

    getStartMessage(): string {
        const minutes = new Minutes(this.waitingTime);
        return `You started working. You'll get paid in ${minutes.stringValue}`;
    }

    getStatusMessage(): string {
        return "You are currently working " + this.getTimeRemainingAsString() + " 🏢";
    }

    getBusyMessage(): string {
        return "You are working " + this.getTimeRemainingAsString();
    }
}

export class CriminalOccupation extends Occupation {

    constructor() {
        super(10, 20);
    }

    getStartMessage(): string {
        const minutes = new Minutes(this.waitingTime);
        return `<b>The police got a hold of you.</b> You're going to prison for ${minutes.stringValue} 👮🏻‍♂️`;
    }

    getStatusMessage(): string {
        return "You are currently locked up with an increasingly angry cellmate " + this.getTimeRemainingAsString() + " 🔒";
    }

    getBusyMessage(): string {
        return "You are in prison " + this.getTimeRemainingAsString();
    }
}
