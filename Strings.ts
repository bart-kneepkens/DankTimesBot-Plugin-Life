import { Commands } from "./model/Commands";
import { LifeAction } from "./model/LifeAction";

export class Strings {

    public static readonly PLUGIN_NAME = "Life";
    public static readonly WORK_MULTIPLIER_SETTING = "life.work.multiplier";
    public static readonly HUSTLE_MULTIPLIER_SETTING = "life.hustle.multiplier";
    public static readonly KILL_COST_PERCENTAGE_SETTING = "life.kill.cost.percentage";
    public static readonly KILL_COST_BOUNTY_MULTIPLIER_SETTING = "life.kill.cost.bountymultiplier";
    public static readonly HOSPITAL_DURATION_MINUTES_SETTING = "life.hospital.duration.minutes";

    static minutes(value: number): string {
        if (value < 1) {
            return "less than a minute";
        } else if (Math.abs(value) == 1) {
            return `${value} minute`;
        } 
        return `${value} minutes`;
    }

    static points(value: number): string {
        if (Math.abs(value) == 1) {
            return `${value} point`;
        }
        return `${value} points`;
    }

    static get officeEmpty(): string {
        return "It's an empty day at the office..";
    }

    static get workingAtTheOffice(): string {
        return "🏢 <b> Players working at the office </b> 🏢 ";
    }

    static get prisonEmpty(): string {
        return "AFK State Penitentiary is completely empty..";
    }

    static get currentlyInPrison(): string {
        return "🔒 <b> Prison inmates </b> 🔒";
    }

    static get hospitalEmpty(): string {
        return "No patients at the hospital today..";
    }

    static get currentlyInHospital(): string {
        return "🏥 <b> Hospital patients </b> 🏥";
    }

    static get bounties(): string {
        return "📃 <b> Bounties </b> 📃";
    }

    static get placeBountyTooFewArgumentsError(): string {
        return "✋ You have to specify a user and a reward, e.g. /placebounty @User 500";
    }

    static get killTooFewArgumentsError(): string {
        return "✋ You have to specify a user, e.g. /kill @User";
    }

    static get userDoesNotExist(): string {
        return "That user does not exist! ✋";
    }

    static get breakoutInstructions(): string {
        return "To break someone out, reply to their message with <code>/breakout</code> ✋";
    }

    static get breakoutYourself(): string {
        return "Breaking out yourself? ✋";
    }

    static get youAreNotInPrison(): string {
        return "You are not in prison, silly 🤪";
    }

    static get bribeInstruction(): string {
        return "Provide argument [amount] - the amount of points you're willing to use to bribe the prison guards";
    }

    static get provideValidPositiveNumber(): string {
        return "Provide a valid, positive number please ✋";
    }

    static cantSpendMoreThanYouHave(amount: number): string {
        return `This will cost you ${amount} points, which you don't have, you filthy peasant ✋`;
    }

    static get bribingSuccessful(): string {
        return "👮🏻‍♂️ Your bribing attempt was successful. You are released from prison!";
    }

    static currentlyWorking(userName: string | null = null): string {
        if (userName) {
            return `${userName} is currently working`;
        }
        return "You are currently working";
    }

    static currentlyIncarcerated(userName: string | null = null): string {
        if (userName) {
            return `${userName} is currently in prison`;
        }
        return "You are currently in prison";
    }

    static currentlyHospitalised(userName: string | null = null): string {
        if (userName) {
            return `${userName} is currently recovering in the hospital`;
        }
        return "You are currently recovering in the hospital";
    }

    static get youAreFree(): string {
        return "You are free to do as you like";
    }

    static get pluginInfo(): string {
        return "🍋 Life - Choose your destiny 🍋 \n\n"
        + `/${Commands.status} - To see how life is looking for you\n`
        + `/${Commands.work} - To earn money the safe (and boring) way\n`
        + `/${Commands.crime1} | /${Commands.crime2} | /${Commands.crime3} - To earn money the gangster way - you may end up in prison!\n` 
        + `/${Commands.office} - See who's in the office\n`
        + `/${Commands.hospital} - See who's in the hospital\n`
        + `/${Commands.prison} - See who's locked up in prison\n`
        + `/${Commands.breakout} - Reply this to a prison inmate to attempt to break them out\n`
        + `/${Commands.bribe} - Attempt to buy your way to freedom - provide an amount of money you're willing to spend!\n`
        + `/${Commands.bounties} - See all outstanding bounties\n`
        + `/${Commands.placebounty} - Place a bounty on a player\n`
        + `/${Commands.kill} - Attempt to kill a player to claim their bounty\n`
        + `/${Commands.togglelifetags} - Toggles if you are tagged whenever you are done working or completed your sentence`;
    }

    static get releasedFromJail(): string {
        return "You're released from prison!";
    }

    static get releasedFromHospital(): string {
        return "You're released from the hospital!";
    }

    static isNotInPrison(username: string): string {
        return `${username} is not in prison.`;
    }

    static didBreakOutInmate(username: string): string {
        return `Broke out ${username}. Here's a reward!`;
    }

    static breakoutFailed(prisonTimeMinutes: number): string {
        return `<b> The breakout failed. </b> You're going to prison for ${Strings.minutes(prisonTimeMinutes)} 👮🏻`;
    }

    static bribingFailed(pointsLost: number) {
        return `👮🏻‍♂️ Your bribing attempt has failed! You've lost ${Strings.points(pointsLost)}! 😭`;
    }

    static hustleSuccessful(gains: number): string {
        return `You hustled and made ${Strings.points(gains)} 💰`;
    }

    static startedWorking(minutesLeft: number): string {
        return `You started working. You'll get paid in ${Strings.minutes(minutesLeft)}`;
    }

    static thrownInJail(minutesLeft: number): string {
        return `<b>The police got a hold of you.</b> You're going to prison for ${Strings.minutes(minutesLeft)} 👮🏻‍♂️`;
    }

    static doneWorking(reward: number): string {
        return `You're done working and earned ${reward} points!`;
    }
    
    static placedBounty(bountyPlacer: string, bounty: number, bountyTarget: string): string {
        return `📃 @${bountyPlacer} put a bounty worth ${bounty} points on @${bountyTarget} !`;
    }

    static actionBlocked(lifeAction: LifeAction): string {
        let verb;

        if (lifeAction === LifeAction.BREAKOUT) {
            verb = "break out";
        } else if (lifeAction === LifeAction.BRIBE) {
            verb = "bribe";
        } else if (lifeAction === LifeAction.HUSTLE) {
            verb = "hustle";
        } else if (lifeAction === LifeAction.KILL) {
            verb = "kill";
        } else if (lifeAction === LifeAction.WORK) {
            verb = "work";
        }
        return `You lack the motivation to ${verb}... 😩`;
    }
}