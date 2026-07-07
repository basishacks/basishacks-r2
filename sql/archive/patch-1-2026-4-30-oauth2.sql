CREATE TABLE "oauth2_applications" (
	"client_id"	TEXT NOT NULL UNIQUE,
	"client_secret"	TEXT NOT NULL,
	"permissions"	TEXT,
	"redirect_uris"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"proxy_microsoft"	INTEGER NOT NULL DEFAULT 0,
	"type" TEXT,
	PRIMARY KEY("client_id")
);