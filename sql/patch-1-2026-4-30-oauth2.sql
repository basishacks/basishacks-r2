CREATE TABLE "oauth2_applications" (
	"client_id"	TEXT NOT NULL UNIQUE,
	"client_secret"	TEXT NOT NULL,
	"permissions"	TEXT,
	"redirect_uris"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	PRIMARY KEY("client_id")
);