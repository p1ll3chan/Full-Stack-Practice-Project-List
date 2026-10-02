CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_system" varchar(32) DEFAULT 'wix' NOT NULL,
	"source_ref" text DEFAULT '' NOT NULL,
	"url" text,
	"file_name" varchar(255),
	"mime_type" varchar(100),
	"width" integer,
	"height" integer,
	"alt_text" text DEFAULT '' NOT NULL,
	"status" varchar(20) DEFAULT 'referenced' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_status_valid" CHECK ("media"."status" in ('referenced', 'ready', 'missing'))
);
--> statement-breakpoint
CREATE TABLE "page_block_gallery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"block_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"media_id" integer,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_blocks_type_valid" CHECK ("page_blocks"."type" in ('heading', 'paragraph', 'list', 'image', 'gallery')),
	CONSTRAINT "page_blocks_image_requires_media" CHECK ("page_blocks"."type" <> 'image' or "page_blocks"."media_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "academic_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_id" integer NOT NULL,
	"overview" jsonb DEFAULT '{"nodes":[]}'::jsonb NOT NULL,
	"overview_source" jsonb,
	"programs_html" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_details_stream_id_unique" UNIQUE("stream_id")
);
--> statement-breakpoint
CREATE TABLE "degree_level_streams" (
	"stream_id" integer NOT NULL,
	"degree_level_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "degree_level_streams_pk" PRIMARY KEY("stream_id","degree_level_id")
);
--> statement-breakpoint
CREATE TABLE "degree_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"level_group" varchar(20) DEFAULT 'undergraduate' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "degree_levels_code_unique" UNIQUE("code"),
	CONSTRAINT "degree_levels_group_valid" CHECK ("degree_levels"."level_group" in ('undergraduate', 'postgraduate', 'doctoral', 'vocational', 'diploma'))
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(36),
	"source_path" varchar(512) DEFAULT '' NOT NULL,
	"source_owner" varchar(36) DEFAULT '' NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"tagline" varchar(255) DEFAULT '' NOT NULL,
	"short_description" varchar(500) DEFAULT '' NOT NULL,
	"category" varchar(100) DEFAULT '' NOT NULL,
	"icon_svg" text DEFAULT '' NOT NULL,
	"image_media_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "faculty_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_id" integer NOT NULL,
	"intro" jsonb DEFAULT '{"nodes":[]}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faculty_details_stream_id_unique" UNIQUE("stream_id")
);
--> statement-breakpoint
CREATE TABLE "excellence_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" varchar(16) DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "excellence_domains_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "college_contact" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"college_name" varchar(255) DEFAULT '' NOT NULL,
	"tagline" varchar(255) DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" varchar(50) DEFAULT '' NOT NULL,
	"email" varchar(255) DEFAULT '' NOT NULL,
	"office_hours" varchar(255) DEFAULT '' NOT NULL,
	"map_embed_url" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "college_contact_singleton" CHECK ("college_contact"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "faculty" RENAME TO "faculty_members";--> statement-breakpoint
ALTER INDEX "faculty_pkey" RENAME TO "faculty_members_pkey";--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "credits" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "stream_id" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "degree_level_id" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "excellence" ADD COLUMN "domain_id" integer;--> statement-breakpoint
ALTER TABLE "excellence" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "excellence" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "faculty_members" ADD COLUMN "stream_id" integer;--> statement-breakpoint
ALTER TABLE "faculty_members" ADD COLUMN "photo_media_id" integer;--> statement-breakpoint
ALTER TABLE "faculty_members" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "section" varchar(50) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "page_block_gallery_items" ADD CONSTRAINT "page_block_gallery_items_block_id_page_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."page_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_block_gallery_items" ADD CONSTRAINT "page_block_gallery_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_blocks" ADD CONSTRAINT "page_blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_blocks" ADD CONSTRAINT "page_blocks_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_details" ADD CONSTRAINT "academic_details_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_level_streams" ADD CONSTRAINT "degree_level_streams_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_level_streams" ADD CONSTRAINT "degree_level_streams_degree_level_id_degree_levels_id_fk" FOREIGN KEY ("degree_level_id") REFERENCES "public"."degree_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_details" ADD CONSTRAINT "faculty_details_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_source_unique" ON "media" USING btree ("source_system","source_ref") WHERE "media"."source_ref" <> '';--> statement-breakpoint
CREATE INDEX "media_status_idx" ON "media" USING btree ("status");--> statement-breakpoint
CREATE INDEX "page_block_gallery_items_block_position_idx" ON "page_block_gallery_items" USING btree ("block_id","position");--> statement-breakpoint
CREATE INDEX "page_blocks_page_position_idx" ON "page_blocks" USING btree ("page_id","position");--> statement-breakpoint
CREATE INDEX "academic_details_stream_idx" ON "academic_details" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX "degree_level_streams_level_idx" ON "degree_level_streams" USING btree ("degree_level_id");--> statement-breakpoint
CREATE INDEX "degree_levels_sort_idx" ON "degree_levels" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "streams_category_idx" ON "streams" USING btree ("category");--> statement-breakpoint
CREATE INDEX "streams_sort_idx" ON "streams" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "streams_active_sort_idx" ON "streams" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "streams_source_id_idx" ON "streams" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "faculty_details_stream_idx" ON "faculty_details" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX "excellence_domains_sort_idx" ON "excellence_domains" USING btree ("sort_order");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_degree_level_id_degree_levels_id_fk" FOREIGN KEY ("degree_level_id") REFERENCES "public"."degree_levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_stream_level_fk" FOREIGN KEY ("stream_id","degree_level_id") REFERENCES "public"."degree_level_streams"("stream_id","degree_level_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excellence" ADD CONSTRAINT "excellence_domain_id_excellence_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."excellence_domains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_members" ADD CONSTRAINT "faculty_members_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty_members" ADD CONSTRAINT "faculty_members_photo_media_id_media_id_fk" FOREIGN KEY ("photo_media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_stream_sort_idx" ON "courses" USING btree ("stream_id","sort_order");--> statement-breakpoint
CREATE INDEX "courses_degree_level_idx" ON "courses" USING btree ("degree_level_id");--> statement-breakpoint
CREATE INDEX "courses_slug_idx" ON "courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "excellence_domain_idx" ON "excellence" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "excellence_year_idx" ON "excellence" USING btree ("year");--> statement-breakpoint
CREATE INDEX "faculty_members_stream_idx" ON "faculty_members" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX "pages_section_idx" ON "pages" USING btree ("section");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "excellence" ADD CONSTRAINT "excellence_year_range" CHECK ("excellence"."year" between 1900 and 2100);--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_section_valid" CHECK ("pages"."section" in ('general', 'about', 'contact', 'academics', 'excellence', 'faculty'));