import { Chat } from "../../../src/chat/chat";
import { User } from "../../../src/chat/user/user";
import { LifeAction } from "../model/LifeAction";

/**
 * Data for the custom event which the Life plugin publishes before a user performs a Life action (work, hustle, kill, etc.).
 */
export interface LifeActionEventData {

    /**
     * The chat in which the action occurs.
     */
    readonly chat: Chat;
    /**
     * The user performing the action.
     */
    readonly user: User;
    /**
     * The target user. For some actions, this is the same as the user performing the action.
     */
    readonly targetUser: User;
    /**
     * The actual Life action being performed.
     */
    readonly action: LifeAction;

    /**
     * The odds for this action to succeed, represented as a number between 0 and 1. Not applicable for work.
     * May be changed to alter the odds of the action succeeding.
     */
    odds: number;
    /**
     * How to handle the odds of the Life action succeeding. May be changed to alter the way the odds are handled.
     */
    forceActionOdds: ForceActionOdds;
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