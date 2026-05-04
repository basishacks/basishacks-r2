CREATE TABLE "users" (
	"id"	INTEGER,
	"email"	TEXT NOT NULL UNIQUE,
	"name"	TEXT,
	"team_id"	INTEGER,
	"login_code"	TEXT,
	"login_expiry"	INTEGER,
	"flags"	TEXT NOT NULL DEFAULT 'participant',
	"role"	TEXT NOT NULL DEFAULT 'participant' CHECK("role" IN ('participant', 'judge', 'admin')),
	"profile_theme"	TEXT,
	"profile_picture"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("team_id") REFERENCES "teams"("id")
);