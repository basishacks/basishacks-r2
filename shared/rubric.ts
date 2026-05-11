export interface RubricData {
  abbr: string
  name: string
  description: string
  weight: number
}

const rubrics = {
  junior: {
    originality: {
      abbr: 'ORG',
      name: 'Innovation & Originality',
      description: 'Novelty of idea and approach.',
      weight: 30,
    },
    presentation: {
      abbr: 'PRE',
      name: 'Presentation & Design',
      description: 'Clarity, polish, and design of demo.',
      weight: 25,
    },
    technicality: {
      abbr: 'TEC',
      name: 'Technical Complexity',
      description: 'Depth and quality of technical implementation.',
      weight: 20,
    },
    theme: {
      abbr: 'THM',
      name: 'Theme Alignment',
      description: 'How clearly the project relates to the theme.',
      weight: 15,
    },
    impact: {
      abbr: 'IMP',
      name: 'Impact & Usefulness',
      description: 'Potential to solve real problems or benefit users.',
      weight: 10,
    },
  },
  senior: {
    impact: {
      abbr: 'IMP',
      name: 'Impact & Usefulness',
      description: 'Potential to solve real problems or benefit users.',
      weight: 30,
    },
    presentation: {
      abbr: 'PRE',
      name: 'Presentation & Design',
      description: 'Clarity, polish, and design of demo.',
      weight: 25,
    },
    technicality: {
      abbr: 'TEC',
      name: 'Technical Complexity',
      description: 'Depth and quality of technical implementation.',
      weight: 20,
    },
    theme: {
      abbr: 'THM',
      name: 'Theme Alignment',
      description: 'How clearly the project relates to the theme.',
      weight: 15,
    },
    originality: {
      abbr: 'ORG',
      name: 'Innovation & Originality',
      description: 'Novelty of idea and approach.',
      weight: 10,
    },
  },
} satisfies {
  junior: Record<string, RubricData>
  senior: Record<string, RubricData>
}

export default rubrics
