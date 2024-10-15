CREATE TABLE IF NOT EXISTS "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"to" text,
	"name" text,
	"subject" text,
	"content" text NOT NULL,
	"send_date" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"canceled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text NOT NULL,
	"event1" boolean,
	"event2" boolean,
	"event3" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"canceled_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp
);
