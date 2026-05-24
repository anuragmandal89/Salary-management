CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`job_title` text NOT NULL,
	`department` text NOT NULL,
	`country` text NOT NULL,
	`salary` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`employment_type` text NOT NULL,
	`hire_date` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_email_unique` ON `employees` (`email`);--> statement-breakpoint
CREATE INDEX `idx_employees_country` ON `employees` (`country`);--> statement-breakpoint
CREATE INDEX `idx_employees_job_title` ON `employees` (`job_title`);--> statement-breakpoint
CREATE INDEX `idx_employees_country_job_title` ON `employees` (`country`,`job_title`);