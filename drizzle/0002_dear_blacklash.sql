CREATE TABLE `safety_checkins` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`device_id` varchar(128) NOT NULL,
	`status` enum('safe','rescue_requested') NOT NULL,
	`hazard` varchar(64) NOT NULL DEFAULT 'other',
	`alert_id` varchar(64),
	`note` varchar(500),
	`latitude` double,
	`longitude` double,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `safety_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `hazard` varchar(64) DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `target_label` varchar(180);--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `target_latitude` double;--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `target_longitude` double;--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `target_radius_m` int;--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `locale` varchar(16) DEFAULT 'en-IN' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_safety_checkins_created` ON `safety_checkins` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_safety_checkins_status` ON `safety_checkins` (`status`);--> statement-breakpoint
CREATE INDEX `idx_disaster_alerts_hazard` ON `disaster_alerts` (`hazard`);