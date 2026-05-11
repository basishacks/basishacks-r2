- [x] Home page
- [x] Registration
  - [x] Email & name
- [x] Team management
  - [x] Add team members
  - [x] Remove team members
- [ ] Submitting projects
  - [x] Project name, description, repo URL, demo URL
- [ ] Peer voting
- [ ] Judges voting

# APIs

- [x] Hackathon
  - [x] GET /hackathon
- [x] Auth
  - [x] POST /auth/code
  - [x] POST /auth/login
- [x] Users
  - [x] GET /users/:id (includes shallow `team`)
  - [x] PATCH /users/:id
- [x] Teams
  - [x] POST /teams
  - [x] PATCH /teams/:id
- [x] Team members
  - [x] GET /teams/:id/users
  - [x] POST /teams/:id/users
  - [x] DELETE /teams/:id/users/:user
- [ ] Admin
  - [ ] PATCH /hackathon
