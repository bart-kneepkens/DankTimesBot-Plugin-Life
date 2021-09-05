import { Commands } from "./plugin";

export class Strings {
    static minutes(value: number): string {
        if (value < 1) {
            return `less than a minute`
        } else if (Math.abs(value) == 1) {
            return `${value} minute`;
        } 
        return `${value} minutes`
    }

    static points(value: number): string {
        if (Math.abs(value) == 1) {
            return `${value} point`;
        }
        return `${value} points`
    }

    static get officeEmpty(): string {
        return "It's an empty day at the AFK office.."
    }

    static get workingAtTheOffice(): string {
        return "🏢 <b> Players working at the office: </b> 🏢 ";
    }

    static get prisonEmpty(): string {
        return "AFK State Penitentiary is completely empty..";
    }

    static get currentlyInPrison(): string {
        return "🔒 <b> Prison inmates: </b> 🔒";
    }

    static get breakoutInstructions(): string {
        return "To break someone out, reply to their message with <code>/breakout</code> ✋";
    }

    static get breakoutYourself(): string {
        return "Breaking out yourself? ✋";
    }

    static get youAreNotInPrison(): string {
        return "you are not in prison, silly 🤪";
    }

    static get bribeInstruction(): string {
        return "Provide argument [amount] - the amount of points you're willing to use to bribe the prison guards";
    }

    static get provideValidPositiveNumber(): string {
        return "Provide a valid, positive number please";
    }

    static get cantSpendMoreThanYouHave(): string {
        return "You can't spend more than you have on bribing";
    }

    static get bribingSuccessful(): string {
        return "👮🏻‍♂️ Your bribing attempt was successful. You are released from prison!";
    }

    static get currentlyWorking(): string {
        return "You are currently working";
    }

    static get currentlyIncarcerated(): string {
        return "You are currently in prison";
    }

    static get youAreFree(): string {
        return "You are free to do as you like";
    }

    static get pluginInfo(): string {
        return "🍋 Life - Choose your destiny 🍋 \n\n"
        + `/${Commands.status} - To see how life is looking for you\n`
        + `/${Commands.work} - To earn money the safe (and boring) way\n`
        + `/${Commands.crime} - To earn money the gangster way - you may end up in prison!\n\n` 
        + `/${Commands.prison} - See who's locked up in prison\n`
        + `/${Commands.office} - See who's in the office\n\n`
        + `/${Commands.breakout} - Reply this to a prison inmate to attempt to break them out\n`
        + `/${Commands.bribe} - Attempt to buy your way to freedom - provide an amount of money you're willing to spend!\n`;
    }

    static isNotInPrison(username: string): string {
        return `${username} is not in prison.`;
    }

    static didBreakOutInmate(username: string): string {
        return `broke out ${username}. Here's a reward!`;
    }

    static breakoutFailed(prisonTimeMinutes: number): string {
        return `<b> The breakout failed. </b> You're going to prison for ${Strings.minutes(prisonTimeMinutes)} 👮🏻`;
    }

    static bribingFailed(pointsLost: number) {
        return `👮🏻‍♂️ Your bribing attempt has failed! You've lost ${Strings.points(pointsLost)}! 😭`;
    }

    static hustleSuccessful(gains: number): string {
        return `You hustled and made ${Strings.points(gains)} 💰`
    }

    static startedWorking(minutesLeft: number): string {
        return `You started working. You'll get paid in ${Strings.minutes(minutesLeft)}`;
    }

    static thrownInJail(minutesLeft: number): string {
        return `<b>The police got a hold of you.</b> You're going to prison for ${Strings.minutes(minutesLeft)} 👮🏻‍♂️`;
    }
}