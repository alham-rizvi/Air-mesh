CREATE TABLE `disaster_alerts` (
	`id` varchar(64) NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` text NOT NULL,
	`type` varchar(80) NOT NULL,
	`severity` enum('critical','high','moderate','low') NOT NULL,
	`source` enum('controlled_publisher','local_report','mesh_relay') NOT NULL,
	`issued_at` timestamp NOT NULL,
	`expires_at` timestamp,
	`origin_device_id` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `disaster_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_disaster_alerts_issued` ON `disaster_alerts` (`issued_at`);--> statement-breakpoint
CREATE INDEX `idx_disaster_alerts_severity` ON `disaster_alerts` (`severity`);