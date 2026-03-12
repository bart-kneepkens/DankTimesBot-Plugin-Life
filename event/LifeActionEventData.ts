import { Chat } from "../../../src/chat/chat";
import { User } from "../../../src/chat/user/user";
import { LifeAction } from "../model/LifeAction";

/**
 * Data for the custom event which the Life plugin publishes before a user performs a Life action (work, hustle, kill, etc.).
 */
export class LifeActionEventData {

    /**
     * How to handle the odds of the Life action succeeding. May be changed to alter the way the odds are handled.
     */
    public forceActionOdds: ForceActionOdds = ForceActionOdds.NO_FORCE;

    public constructor(
        /**
         * The chat in which the action occurs.
         */
        public readonly chat: Chat,
        /**
         * The user performing the action.
         */
        public readonly user: User,
        /**
         * The actual Life action being performed.
         */
        public readonly action: LifeAction,

        /**
         * The odds for this action to succeed, represented as a number between 0 and 1. Not applicable for work.
         * May be changed to alter the odds of the action succeeding.
         */
        public odds: number = 0
    ) { }
}

/**
 * Enum for forcing (or not forcing) the odds of the Life action succeeding into a specific direction.
 */
export enum ForceActionOdds {
    /**
     * Do not force a result: respect the given odds.
     */
    NO_FORCE,
    /**
     * Force a failure, regardless of the odds.
     */
    FORCE_FAILURE,
    /**
     * Force a success, regardless of the odds.
     */
    FORCE_SUCCESS,
    /**
     * If the action should be blocked entirely before even attempting it.
     */
    BLOCK
}