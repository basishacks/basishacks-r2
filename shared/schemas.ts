import z from 'zod'
import rubrics from './rubric'

const BasisEmail = z
  .email()
  .refine(
    (s) => s.toLowerCase().endsWith('@basischina.com'),
    'Please use a @basischina.com email'
  )

const TeamName = z
  .string()
  .min(2, 'Team name must be at least 2 characters')
  .max(30, 'Team name cannot be longer than 30 characters')

const TeamPathway = z.literal(['junior', 'senior'])

const BooleanString = z
  .literal(['true', 'false'])
  .transform((s) => s === 'true')

const ZeroToFive = z.literal([0, 1, 2, 3, 4, 5])
const ScoreValues = z.object(
  Object.keys(rubrics['junior']).reduce(
    (obj, key) => ({
      ...obj,
      [key]: ZeroToFive,
    }),
    {} as Record<keyof (typeof rubrics)['junior'], typeof ZeroToFive>
  )
)

export const SendCodeRequest = z.object({
  email: BasisEmail,
})
export type SendCodeRequest = z.infer<typeof SendCodeRequest>

export const LoginRequest = z.object({
  email: BasisEmail,
  code: z.string().max(10),
})
export type LoginRequest = z.infer<typeof LoginRequest>

export const CreateTeamQuery = z.object({
  add: BooleanString.optional(),
})
export type CreateTeamQuery = z.infer<typeof CreateTeamQuery>

export const CreateTeamRequest = z.object({
  name: TeamName,
})
export type CreateTeamRequest = z.infer<typeof CreateTeamRequest>

export const UpdateTeamRequest = z.object({
  name: z.optional(TeamName),
  pathway: z.optional(TeamPathway),
  project: z.optional(
    z.object({
      name: z.optional(z.string().max(50)),
      description: z.optional(z.string().max(2000)),
      demo_url: z
        .union([z.url(), z.literal('')])
        .nullish()
        .transform((v) => (v === '' ? null : v)),
      repo_url: z
        .union([z.url(), z.literal('')])
        .nullish()
        .transform((v) => (v === '' ? null : v)),
    })
  ),
})
export type UpdateTeamRequest = z.infer<typeof UpdateTeamRequest>

export const SubmitTeamRequest = z.object({
  pathway: TeamPathway,
  project: z.object({
    name: z.string().nonempty(),
    description: z
      .string()
      .min(30, 'Please provide more details in the description'),
    demo_url: z.url(),
    repo_url: z.url(),
  }),
})
export type SubmitTeamRequest = z.infer<typeof SubmitTeamRequest>

export const AddTeamMemberRequest = z.object({
  email: BasisEmail,
})
export type AddTeamMemberRequest = z.infer<typeof AddTeamMemberRequest>

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}



export const UpdateUserRequest = z.object({
  name: z.optional(z.string().max(30)), 
  profile_theme_image: z.optional(z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, 
      `The image is too large. Please choose an image smaller than ${formatBytes(MAX_FILE_SIZE)}.`
    )
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), 
      'Please upload a valid image file (JPEG, PNG, or WebP)'
    ))
    .or(
      z.string().startsWith('data')
    )
    
    
})
export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>

export const CreateTeamScoresRequest = z.object({
  reasoning: z.string().min(10, 'Please write more').max(2000),
  scores: ScoreValues,
})
export type CreateTeamScoresRequest = z.infer<typeof CreateTeamScoresRequest>

export const SubmitVoteRequest = z
  .object({
    scores: z.array(z.literal([1, 2, 3, 4, 5])),
    reasoning: z.string().min(30, 'Please write a bit more').max(2000, 'You wrote too much!'),
  })
  .refine(
    ({ scores }) => scores.reduce((a, b) => a + b, 0) === 12,
    'Stars must sum to 12'
  )
export type SubmitVoteRequest = z.infer<typeof SubmitVoteRequest>
