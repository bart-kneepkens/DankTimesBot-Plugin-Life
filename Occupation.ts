import { User } from "../../src/chat/user/user";

export abstract class Occupation {

    public waitingTime: number;
    private endTime: Date;

    constructor(minTime: number, maxTime: number) {
        this.waitingTime = this.getRandomWaitingTime(minTime, maxTime);
        this.endTime = new Date(Date.now() + (this.waitingTime * 60000));
    }

    getTimeRemaining(): number {
        return Math.round((this.endTime.valueOf() - new Date().valueOf()) / 60000);
    }

    protected getTimeRemainingAsString(): string {
        const timeRemaining = this.getTimeRemaining();
        if (timeRemaining === 1) {
            return "for " + this.getTimeRemaining() + " more minute.";
        }
        else {
            return "for " + this.getTimeRemaining() + " more minutes.";
        }
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
        return "You started working. You'll get paid in " + this.waitingTime + " minutes. ";
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
        return "<b>The police got a hold of you.</b> You're going to prison for " + this.waitingTime + " minutes👮🏻‍ ";
    }

    getStatusMessage(): string {
        return "You are currently locked up with an increasingly sexually frustrated cellmate " + this.getTimeRemainingAsString() + " 🔒";
    }

    getBusyMessage(): string {
        return "You are in prison " + this.getTimeRemainingAsString();
    }
}
