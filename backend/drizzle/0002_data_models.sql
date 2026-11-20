CREATE TABLE "starter_feeds" (
	"feed_id" uuid PRIMARY KEY NOT NULL,
	"category_name" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_read_states" (
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"is_read" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_read_states_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid NOT NULL,
	"guid" text NOT NULL,
	"url" text,
	"title" text NOT NULL,
	"author" text,
	"summary" text NOT NULL,
	"content_html" text NOT NULL,
	"has_full_content" boolean NOT NULL,
	"image_url" text,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sort_at" timestamp with time zone GENERATED ALWAYS AS (coalesce(published_at, first_seen_at)) STORED NOT NULL,
	"content_hash" text NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', summary), 'B')) STORED,
	CONSTRAINT "items_feed_id_guid_unique" UNIQUE("feed_id","guid")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"layout" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feed_id" uuid NOT NULL,
	"category_id" uuid,
	"custom_title" text,
	"position" integer DEFAULT 0 NOT NULL,
	"read_cutoff" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_feed_id_unique" UNIQUE("user_id","feed_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"layout" text DEFAULT 'list' NOT NULL,
	"refresh_interval_minutes" integer DEFAULT 30 NOT NULL,
	"item_order" text DEFAULT 'newest' NOT NULL,
	"show_read" boolean DEFAULT true NOT NULL,
	"last_visited_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_refresh_interval_check" CHECK ("user_preferences"."refresh_interval_minutes" in (0, 15, 30, 60)),
	CONSTRAINT "user_preferences_item_order_check" CHECK ("user_preferences"."item_order" in ('newest', 'oldest'))
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
UPDATE "feeds" SET "title" = "url" WHERE "title" IS NULL;--> statement-breakpoint
ALTER TABLE "feeds" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "site_url" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "format" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "etag" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_modified" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_fetched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_success_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_error_code" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_error_message" text;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "last_error_status" integer;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "latest_item_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "next_fetch_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "starter_feeds" ADD CONSTRAINT "starter_feeds_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_read_states" ADD CONSTRAINT "item_read_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_read_states" ADD CONSTRAINT "item_read_states_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_read_states_item_id_idx" ON "item_read_states" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "items_feed_id_sort_at_idx" ON "items" USING btree ("feed_id","sort_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "items_feed_id_first_seen_at_idx" ON "items" USING btree ("feed_id","first_seen_at");--> statement-breakpoint
CREATE INDEX "items_search_idx" ON "items" USING gin ("search");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_id_name_unique" ON "categories" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "categories_user_id_position_idx" ON "categories" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_category_id_idx" ON "subscriptions" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "subscriptions_feed_id_idx" ON "subscriptions" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "bookmarks_user_id_created_at_idx" ON "bookmarks" USING btree ("user_id","created_at" DESC NULLS FIRST,"item_id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "bookmarks_item_id_idx" ON "bookmarks" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "feeds_next_fetch_at_idx" ON "feeds" USING btree ("next_fetch_at");--> statement-breakpoint
ALTER TABLE "feeds" DROP COLUMN "category";