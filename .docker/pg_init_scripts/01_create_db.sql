DROP TYPE IF EXISTS "user";
CREATE TABLE "user" (
    "id" uuid PRIMARY KEY NOT NULL,
    "name" character varying(200),
    "email" character varying(150) UNIQUE NOT NULL,
    "username" character varying(14) UNIQUE NOT NULL,
    "userpass" character varying(255),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

DROP TYPE IF EXISTS "post";
CREATE TABLE "post" (
    "id" uuid PRIMARY KEY NOT NULL,
    "text" text NOT NULL,
    "user_id" uuid NOT NULL,
    "repost" boolean DEFAULT FALSE,
    "original_post_id" uuid NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY("user_id")  REFERENCES "user"("id")
);

DROP TYPE IF EXISTS "quotes";
CREATE TABLE "quotes" (
    "id" uuid PRIMARY KEY NOT NULL,
    "text" text NOT NULL,
    "user_id" uuid NOT NULL,
    "original_post_id" uuid NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY("user_id")  REFERENCES "user"("id"),
    FOREIGN KEY("original_post_id")  REFERENCES "post"("id")
);