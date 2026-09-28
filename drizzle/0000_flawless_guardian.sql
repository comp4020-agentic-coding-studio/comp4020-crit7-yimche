CREATE TABLE `car_parks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`hours` text NOT NULL,
	`rate` text NOT NULL,
	`permit` text NOT NULL,
	`fees` text NOT NULL,
	`notes` text,
	`capacity` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `car_parks_slug_unique` ON `car_parks` (`slug`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`car_park_id` integer NOT NULL,
	`level` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`car_park_id`) REFERENCES `car_parks`(`id`) ON UPDATE no action ON DELETE no action
);
