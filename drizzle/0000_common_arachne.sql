CREATE TABLE `emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`to` text,
	`name` text,
	`subject` text,
	`content` text NOT NULL,
	`send_date` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`canceled_at` text
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`email` text NOT NULL,
	`event1` integer,
	`event2` integer,
	`event3` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`canceled_at` text,
	`updated_at` text,
	`deleted_at` text
);
