ALTER TABLE `disaster_alerts` ADD `status` enum('active','resolved') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `status` enum('active','resolved') NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `disaster_alerts` ADD `resolved_at` timestamp;
