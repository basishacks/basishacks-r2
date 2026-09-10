import { DelegatedPermissionSet, type PermissionRequirement } from "@basis/schema/permissions";

/** Canonical permissions issued by basis-auth for the basishacks resource. */
export const NethackPermissions = {
    all: "nethack.all",
    Profile: { updateSelf: "nethack.Profile.updateSelf" },
    Teams: {
        create: "nethack.Teams.create",
        membersAddOwn: "nethack.Teams.membersAddOwn",
        membersRemoveOwn: "nethack.Teams.membersRemoveOwn",
        list: "nethack.Teams.list",
        delete: "nethack.Teams.delete",
    },
    Projects: {
        updateOwn: "nethack.Projects.updateOwn",
        submitOwn: "nethack.Projects.submitOwn",
    },
    Voting: { readOwn: "nethack.Voting.readOwn", submitOwn: "nethack.Voting.submitOwn" },
    Judging: {
        assignmentsRead: "nethack.Judging.assignmentsRead",
        scoresWriteAssigned: "nethack.Judging.scoresWriteAssigned",
        resultsRead: "nethack.Judging.resultsRead",
        resultsCompute: "nethack.Judging.resultsCompute",
    },
    Seasons: {
        create: "nethack.Seasons.create",
        update: "nethack.Seasons.update",
        delete: "nethack.Seasons.delete",
        activate: "nethack.Seasons.activate",
    },
    Hackathon: { read: "nethack.Hackathon.read", update: "nethack.Hackathon.update" },
    Users: { list: "nethack.Users.list", delete: "nethack.Users.delete" },
    Debug: {
        filesRead: "nethack.Debug.filesRead",
        filesWrite: "nethack.Debug.filesWrite",
        deepseekRead: "nethack.Debug.deepseekRead",
        deepseekWrite: "nethack.Debug.deepseekWrite",
    },
    Chatbot: { use: "nethack.Chatbot.use" },
    Database: { export: "nethack.Database.export" },
} as const;

export function hasNethackPermission(
    permissions: Iterable<string> | undefined,
    requirement: PermissionRequirement,
): boolean {
    return new DelegatedPermissionSet(permissions ?? []).satisfies(requirement);
}
