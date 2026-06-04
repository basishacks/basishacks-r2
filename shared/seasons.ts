export interface HackathonSeason {
  id: number
  theme_name: string | null
  theme_description: string | null,
  date: string | null,
  docs: string | null
}

const hackathonSeasons: Record<number, HackathonSeason> = {
  2: {
    id: 2,
    theme_name: "Signal",
    theme_description: "signal",
    date: "February 2026",
    docs: "https://slack-files.com/T09V59WQY1E-F0A8LUTHZHQ-0eb4891888"
  },
  1: {
    id: 1,
    theme_name: "Beneath the Surface",
    theme_description: "Explore the hidden depths of our world",
    date: "May 2026",
    docs: null
  }
}

export default hackathonSeasons;