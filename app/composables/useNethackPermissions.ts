import type { PermissionRequirement } from "@basis/schema/permissions";
import { hasNethackPermission } from "~~/shared/permissions";

/** Client-only permission state for display decisions; APIs enforce it server-side. */
export function useNethackPermissions() {
    const permissions = useState<string[]>("basis-permissions", () => []);

    return {
        permissions,
        can: (requirement: PermissionRequirement) =>
            hasNethackPermission(permissions.value, requirement),
    };
}
