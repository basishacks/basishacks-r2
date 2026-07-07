export interface Award {
    namespace: string;
    name: string;
    description: string;
    icon: string;
    computed?: (meta: Record<string, unknown>) => string[];
}

export const AWARD_REGISTRY: Record<string, Award> = {
    perfect_score: {
        namespace: "perfect_score",
        name: "Flawless",
        description: "Achieve a perfect score from all judges.",
        icon: "i-lucide-gem",
    },
};
