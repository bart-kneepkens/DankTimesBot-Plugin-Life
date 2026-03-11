import { Chat } from "../../../src/chat/chat";
import { User } from "../../../src/chat/user/user";
import { OccupationEnum } from "./OccupationEnum";

/**
 * Data for the custom event to which the Life plugin listens.
 */
export interface ForceOccupationChange {
    /**
     * The chat from which the occupation change is launched.
     */
    readonly chat: Chat;
    /**
     * The user whose occupation is being changed.
     */
    readonly user: User;
    /**
     * The occupation which the user is being changed from or to.
     */
    readonly occupation: OccupationEnum;
    /**
     * The change to the user's occupation.
     */
    readonly occupationChange: OccupationChange;
    /**
     * Only applicable if the user is being changed to (so not from) an occupation.
     * Instructs the plugin how many minutes the user will be working/jailed/hospitalized for.
     * If set to <= 0, then defaults are used.
     */
    readonly minutes: number;

    /**
     * Success indicator for the event publisher. Tells them if this occupation change succeeded.
     */
    success: boolean;
    /**
     * Contains an error message if the occupation change failed, else empty string.
     */
    errorMessage: string;
}

/**
 * Occupation change.
 */
export enum OccupationChange {
    /**
     * Makes the user start the occupation, but only if it makes sense.
     */
    CONSCRIPT,
    /**
     * Makes the user start the occupation, regardless of if it makes sense or not.
     */
    FORCE_CONSCRIPT,
    /**
     * Makes the user stop their current occupation.
     */
    RELEASE
}