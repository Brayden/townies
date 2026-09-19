ALTER TABLE `residents` ADD `last_active` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Recover only activity for which we still have evidence. Disconnects used to
-- clear seen, so older sessions without movement cannot be reconstructed.
UPDATE residents SET last_active=MAX(seen,move_updated,created);
--> statement-breakpoint
CREATE TRIGGER resident_activity_insert AFTER INSERT ON residents
WHEN NEW.seen > NEW.last_active
BEGIN
  UPDATE residents SET last_active=NEW.seen WHERE id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER resident_activity_seen AFTER UPDATE OF seen ON residents
WHEN NEW.seen > NEW.last_active
BEGIN
  UPDATE residents SET last_active=NEW.seen WHERE id=NEW.id;
END;
