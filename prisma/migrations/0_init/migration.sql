-- CreateTable
CREATE TABLE "academic_areas" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "academic_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_year_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(20),
    "icon" VARCHAR(50),
    "order" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "academic_year_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_calendar" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "type" VARCHAR(20) NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "academic_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "year_code" VARCHAR(20),
    "type" VARCHAR(20) DEFAULT 'regular',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "description" TEXT,
    "close_date" TIMESTAMPTZ(6),
    "close_reason" TEXT,
    "close_observations" TEXT,
    "file" JSONB,
    "copy_structure" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'planned',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "type_id" INTEGER,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "entry_time1" TIMESTAMPTZ(6),
    "entry_status1" VARCHAR(20),
    "registered_by_entry1" INTEGER,
    "exit_time1" TIMESTAMPTZ(6),
    "exit_status1" VARCHAR(20),
    "registered_by_exit1" INTEGER,
    "entry_time2" TIMESTAMPTZ(6),
    "entry_status2" VARCHAR(20),
    "registered_by_entry2" INTEGER,
    "exit_time2" TIMESTAMPTZ(6),
    "exit_status2" VARCHAR(20),
    "registered_by_exit2" INTEGER,
    "observations" TEXT,
    "late_justified" BOOLEAN DEFAULT false,
    "late_justification" TEXT,
    "justified_by" INTEGER,
    "justification_date" TIMESTAMPTZ(6),
    "registration_type" VARCHAR(20) DEFAULT 'qr',
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_schedules" (
    "id" SERIAL NOT NULL,
    "entry1_start_time" TIME(6) NOT NULL,
    "entry1_limit_time" TIME(6) NOT NULL,
    "exit1_expected_time" TIME(6) NOT NULL,
    "entry2_start_time" TIME(6),
    "entry2_limit_time" TIME(6),
    "exit2_expected_time" TIME(6),
    "tolerance_minutes" INTEGER DEFAULT 15,
    "applicable_days" JSONB,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "level_id" INTEGER NOT NULL,

    CONSTRAINT "attendance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "changes" JSONB,
    "user_id" INTEGER NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "image" TEXT,
    "file" TEXT,
    "file_name" VARCHAR(255),
    "file_type" VARCHAR(100),
    "file_size" INTEGER,
    "published_by" INTEGER NOT NULL,
    "publication_date" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacities" (
    "id" SERIAL NOT NULL,
    "competency_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "capacities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "sender" INTEGER NOT NULL,
    "recipients" JSONB NOT NULL,
    "requires_confirmation" BOOLEAN DEFAULT false,
    "priority" VARCHAR(20) DEFAULT 'medium',
    "send_date" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_date" TIMESTAMPTZ(6),
    "expiration_date" TIMESTAMPTZ(6),
    "attachments" JSONB,
    "attended" BOOLEAN DEFAULT false,
    "attended_date" TIMESTAMPTZ(6),
    "statistics" JSONB,
    "status" VARCHAR(20) DEFAULT 'draft',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "level_id" INTEGER,
    "academic_area_id" INTEGER,
    "order" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_averages" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "course_competency_id" INTEGER NOT NULL,
    "annual_average" DECIMAL(4,2) NOT NULL,
    "grading_system" VARCHAR(20) NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "competency_averages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_grades" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "course_competency_id" INTEGER,
    "category_id" VARCHAR(255),
    "subcategory_id" VARCHAR(255),
    "quarter" INTEGER NOT NULL,
    "value" VARCHAR(10) NOT NULL,
    "grading_system" VARCHAR(20) NOT NULL,
    "observation" TEXT,
    "teacher_id" INTEGER NOT NULL,
    "registration_date" TIMESTAMPTZ(6) NOT NULL,
    "last_modification" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "competency_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "weekly_hours" INTEGER DEFAULT 4,
    "section_id" INTEGER,
    "observations" TEXT,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_competencies" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "competency_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "course_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "grade_id" INTEGER,
    "level_id" INTEGER,
    "academic_area_id" INTEGER,
    "area" VARCHAR(100),
    "weekly_hours" INTEGER DEFAULT 4,
    "type" VARCHAR(20) DEFAULT 'required',
    "description" TEXT,
    "objectives" TEXT,
    "methodology" TEXT,
    "resources" TEXT,
    "evaluation" TEXT,
    "teachers" JSONB,
    "academic_year_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_configs" (
    "id" SERIAL NOT NULL,
    "children_quantity" INTEGER NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "academic_year" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "discount_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "category" VARCHAR(100),
    "file_url" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(100),
    "file_size" INTEGER,
    "visible_to" VARCHAR(20) DEFAULT 'all',
    "uploaded_by" INTEGER NOT NULL,
    "upload_date" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_structures" (
    "id" SERIAL NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "teacher_id" INTEGER,
    "quarter" INTEGER NOT NULL,
    "categories" JSONB,
    "competencies" JSONB,
    "academic_year" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "grading_system" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "evaluation_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "courses_json" JSONB,
    "academic_year_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "academic_year_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculation" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "level_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "enrollment_date" DATE NOT NULL,
    "observations" TEXT,
    "contract_file_path" VARCHAR(500),
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "matriculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_attendances" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "student_id" INTEGER,
    "attended" BOOLEAN NOT NULL,
    "observations" TEXT,
    "registered_by" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "meeting_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_meetings" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "time" TIME(6),
    "place" VARCHAR(255),
    "academic_year" INTEGER NOT NULL,
    "academic_year_id" INTEGER,
    "scope" VARCHAR(20) NOT NULL,
    "level_id" INTEGER,
    "grade_id" INTEGER,
    "section_id" INTEGER,
    "convened_by" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'scheduled',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "parent_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_concepts" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "frequency" VARCHAR(20),
    "due_day" INTEGER,
    "applies_to_all" BOOLEAN DEFAULT true,
    "levels" JSONB,
    "applicable_months" JSONB,
    "specific_students" JSONB,
    "excluded_students" JSONB,
    "unique_payment_date" DATE,
    "academic_year_id" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intentions" (
    "id" SERIAL NOT NULL,
    "obligation_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "operation_number" VARCHAR(100) NOT NULL,
    "observations" TEXT,
    "voucher" TEXT,
    "rejection_reason" TEXT,
    "payment_date" TIMESTAMPTZ(6) NOT NULL,
    "registration_date" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_intentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "qr_code" TEXT,
    "bank" VARCHAR(100),
    "account_number" VARCHAR(50),
    "cci" VARCHAR(50),
    "holder" VARCHAR(255),
    "instructions" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_obligations" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "due_month" INTEGER,
    "due_date" DATE NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) DEFAULT 0,
    "pending_balance" DECIMAL(10,2) NOT NULL,
    "generation_date" TIMESTAMPTZ(6) NOT NULL,
    "last_payment_date" TIMESTAMPTZ(6),
    "alerts_sent" JSONB,
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" SERIAL NOT NULL,
    "obligation_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "concept_id" INTEGER NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL,
    "pending_balance" DECIMAL(10,2) NOT NULL,
    "payments" JSONB,
    "status" VARCHAR(20) DEFAULT 'pending',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_commitments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "students" JSONB NOT NULL,
    "months" JSONB NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "commitment_date" TIMESTAMPTZ(6) NOT NULL,
    "observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(50),
    "action" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychological_reports" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "academic_year" VARCHAR(10) NOT NULL,
    "issue_date" DATE NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_base64" TEXT,
    "file_size" INTEGER,
    "observations" TEXT,
    "uploaded_by" INTEGER NOT NULL,
    "upload_date" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "psychological_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarter_averages" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "partial_average" DECIMAL(4,2) NOT NULL,
    "cumulative_average" DECIMAL(4,2) NOT NULL,
    "calculation_detail" JSONB,
    "academic_year" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'approved',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "quarter_averages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "read_confirmations" (
    "id" SERIAL NOT NULL,
    "communication_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "send_date" TIMESTAMPTZ(6) NOT NULL,
    "read_date" TIMESTAMPTZ(6),
    "confirmation_date" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(45),
    "device" TEXT,
    "status" VARCHAR(20) DEFAULT 'sent',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "read_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_card_visibility" (
    "id" SERIAL NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "level_id" INTEGER,
    "grade_id" INTEGER,
    "visible" BOOLEAN NOT NULL,
    "authorization_date" TIMESTAMPTZ(6),
    "authorized_by" INTEGER,
    "observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "report_card_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "roles_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_images" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "level_id" INTEGER,
    "grade_id" INTEGER,
    "section_id" INTEGER,
    "teacher_id" INTEGER,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "image_data" TEXT NOT NULL,
    "upload_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "file_path" VARCHAR(500),

    CONSTRAINT "schedule_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "classroom" VARCHAR(50),
    "observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "name" VARCHAR(5) NOT NULL,
    "capacity" INTEGER DEFAULT 30,
    "tutor_id" INTEGER,
    "shift" VARCHAR(20) DEFAULT 'mañana',
    "students" JSONB,
    "academic_year" INTEGER NOT NULL,
    "academic_year_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_behaviors" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "academic_year_id" INTEGER,
    "discipline" VARCHAR(10),
    "parent_rating" VARCHAR(10),
    "comments" TEXT,
    "grading_system" VARCHAR(20) NOT NULL,
    "registered_by" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "student_behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_qr_codes" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "qr_code" VARCHAR(255) NOT NULL,
    "generation_date" TIMESTAMPTZ(6) NOT NULL,
    "generated_by" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "student_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "barcode" VARCHAR(255) NOT NULL,
    "first_names" VARCHAR(255) NOT NULL,
    "last_names" VARCHAR(255) NOT NULL,
    "paternal_last_name" VARCHAR(100),
    "maternal_last_name" VARCHAR(100),
    "dni" VARCHAR(12) NOT NULL,
    "document_type" VARCHAR(10) DEFAULT 'DNI',
    "birth_date" DATE NOT NULL,
    "gender" VARCHAR(1) NOT NULL,
    "address" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "level_id" INTEGER,
    "grade_id" INTEGER,
    "section_id" INTEGER,
    "academic_year_id" INTEGER,
    "enrollment_date" DATE,
    "has_double_shift" BOOLEAN DEFAULT false,
    "parents" JSONB,
    "attached_contract" JSONB,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "grade_id" INTEGER NOT NULL,
    "section_ids" JSONB,
    "academic_year" INTEGER NOT NULL,
    "academic_year_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_tasks" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "teacher_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_names" VARCHAR(255),
    "dni" VARCHAR(12) NOT NULL,
    "document_type" VARCHAR(10) DEFAULT 'DNI',
    "role_id" INTEGER NOT NULL,
    "relationship" VARCHAR(50),
    "phone" VARCHAR(20),
    "address" TEXT,
    "specialty" VARCHAR(100),
    "level" VARCHAR(50),
    "entry_date" DATE,
    "last_login" TIMESTAMPTZ(6),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "birth_date" DATE,
    "gender" VARCHAR(1),
    "marital_status" VARCHAR(20),
    "nationality" VARCHAR(50),
    "occupation" VARCHAR(100),
    "company" VARCHAR(100),
    "work_phone" VARCHAR(20),
    "secondary_email" VARCHAR(255),
    "district" VARCHAR(100),
    "province" VARCHAR(100),
    "department" VARCHAR(100),
    "postal_code" VARCHAR(10),
    "emergency_contact_name" VARCHAR(255),
    "emergency_contact_relationship" VARCHAR(50),
    "emergency_contact_phone" VARCHAR(20),
    "emergency_contact_address" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_quarter_averages" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "category_id" VARCHAR(255) NOT NULL,
    "quarter" INTEGER NOT NULL,
    "average_value" DECIMAL(5,2) NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "grading_system" VARCHAR(20) NOT NULL,
    "calculation_details" JSONB,
    "status" VARCHAR(20) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competency_quarter_averages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_areas_name_key" ON "academic_areas"("name");

-- CreateIndex
CREATE INDEX "idx_academic_areas_orden" ON "academic_areas"("order");

-- CreateIndex
CREATE UNIQUE INDEX "academic_year_types_code_key" ON "academic_year_types"("code");

-- CreateIndex
CREATE INDEX "idx_academic_year_types_estado" ON "academic_year_types"("status");

-- CreateIndex
CREATE INDEX "idx_academic_year_types_orden" ON "academic_year_types"("order");

-- CreateIndex
CREATE INDEX "idx_academic_calendar_año_escolar_id" ON "academic_calendar"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_academic_calendar_fecha_inicio" ON "academic_calendar"("start_date");

-- CreateIndex
CREATE INDEX "idx_academic_calendar_tipo" ON "academic_calendar"("type");

-- CreateIndex
CREATE INDEX "idx_academic_years_estado" ON "academic_years"("status");

-- CreateIndex
CREATE INDEX "idx_academic_years_fecha_inicio" ON "academic_years"("start_date");

-- CreateIndex
CREATE INDEX "idx_academic_years_type_id" ON "academic_years"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_academic_years_año_tipo" ON "academic_years"("year", "type");

-- CreateIndex
CREATE INDEX "idx_attendance_records_estudiante_id" ON "attendance_records"("student_id");

-- CreateIndex
CREATE INDEX "idx_attendance_records_fecha" ON "attendance_records"("date");

-- CreateIndex
CREATE INDEX "idx_attendance_records_month" ON "attendance_records"("date" DESC, "student_id");

-- CreateIndex
CREATE INDEX "idx_attendance_records_date_status" ON "attendance_records"("date", "status");

-- CreateIndex
CREATE INDEX "idx_attendance_records_student_date" ON "attendance_records"("student_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "uk_attendance_records" ON "attendance_records"("student_id", "date");

-- CreateIndex
CREATE INDEX "idx_attendance_schedules_activo" ON "attendance_schedules"("status");

-- CreateIndex
CREATE INDEX "idx_attendance_schedules_nivel_id" ON "attendance_schedules"("level_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_id" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_type" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_announcements_active" ON "announcements"("status");

-- CreateIndex
CREATE INDEX "idx_announcements_publication_date" ON "announcements"("publication_date");

-- CreateIndex
CREATE INDEX "idx_announcements_published_by" ON "announcements"("published_by");

-- CreateIndex
CREATE UNIQUE INDEX "capacities_code_key" ON "capacities"("code");

-- CreateIndex
CREATE INDEX "idx_capacities_codigo" ON "capacities"("code");

-- CreateIndex
CREATE INDEX "idx_capacities_competencia_id" ON "capacities"("competency_id");

-- CreateIndex
CREATE INDEX "idx_communications_estado" ON "communications"("status");

-- CreateIndex
CREATE INDEX "idx_communications_fecha_envio" ON "communications"("send_date");

-- CreateIndex
CREATE INDEX "idx_communications_prioridad" ON "communications"("priority");

-- CreateIndex
CREATE INDEX "idx_communications_remitente" ON "communications"("sender");

-- CreateIndex
CREATE INDEX "idx_communications_tipo" ON "communications"("type");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_code_key" ON "competencies"("code");

-- CreateIndex
CREATE INDEX "idx_competencies_area_academica_id" ON "competencies"("academic_area_id");

-- CreateIndex
CREATE INDEX "idx_competencies_codigo" ON "competencies"("code");

-- CreateIndex
CREATE INDEX "idx_competencies_nivel_id" ON "competencies"("level_id");

-- CreateIndex
CREATE INDEX "idx_competency_averages_año_escolar" ON "competency_averages"("academic_year");

-- CreateIndex
CREATE INDEX "idx_competency_averages_course_competency_id" ON "competency_averages"("course_competency_id");

-- CreateIndex
CREATE INDEX "idx_competency_averages_curso_id" ON "competency_averages"("course_id");

-- CreateIndex
CREATE INDEX "idx_competency_averages_estudiante_id" ON "competency_averages"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_competency_averages" ON "competency_averages"("student_id", "course_competency_id", "academic_year");

-- CreateIndex
CREATE INDEX "idx_competency_grades_bimestre" ON "competency_grades"("quarter");

-- CreateIndex
CREATE INDEX "idx_competency_grades_course_competency_id" ON "competency_grades"("course_competency_id");

-- CreateIndex
CREATE INDEX "idx_competency_grades_curso_id" ON "competency_grades"("course_id");

-- CreateIndex
CREATE INDEX "idx_competency_grades_estudiante_id" ON "competency_grades"("student_id");

-- CreateIndex
CREATE INDEX "idx_competency_grades_category_id" ON "competency_grades"("category_id");

-- CreateIndex
CREATE INDEX "idx_competency_grades_subcategory_id" ON "competency_grades"("subcategory_id");

-- CreateIndex
CREATE INDEX "idx_competency_grades_composite" ON "competency_grades"("student_id", "category_id", "subcategory_id", "quarter");

-- CreateIndex
CREATE INDEX "idx_competency_grades_course_quarter" ON "competency_grades"("course_id", "quarter");

-- CreateIndex
CREATE INDEX "idx_competency_grades_student_quarter" ON "competency_grades"("student_id", "quarter");

-- CreateIndex
CREATE INDEX "idx_course_assignments_curso_id" ON "course_assignments"("course_id");

-- CreateIndex
CREATE INDEX "idx_course_assignments_grado_id" ON "course_assignments"("grade_id");

-- CreateIndex
CREATE INDEX "idx_course_assignments_profesor_id" ON "course_assignments"("teacher_id");

-- CreateIndex
CREATE INDEX "idx_course_assignments_section_id" ON "course_assignments"("section_id");

-- CreateIndex
CREATE INDEX "idx_course_assignments_weekly_hours" ON "course_assignments"("weekly_hours");

-- CreateIndex
CREATE UNIQUE INDEX "uk_course_assignments" ON "course_assignments"("course_id", "grade_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "idx_course_competencies_año_escolar" ON "course_competencies"("academic_year");

-- CreateIndex
CREATE INDEX "idx_course_competencies_competencia_id" ON "course_competencies"("competency_id");

-- CreateIndex
CREATE INDEX "idx_course_competencies_curso_id" ON "course_competencies"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_course_competencies" ON "course_competencies"("course_id", "competency_id", "academic_year");

-- CreateIndex
CREATE INDEX "idx_courses_area_academica_id" ON "courses"("academic_area_id");

-- CreateIndex
CREATE INDEX "idx_courses_estado" ON "courses"("status");

-- CreateIndex
CREATE INDEX "idx_courses_grado_id" ON "courses"("grade_id");

-- CreateIndex
CREATE INDEX "idx_courses_nivel_id" ON "courses"("level_id");

-- CreateIndex
CREATE INDEX "idx_discount_configs_año_escolar" ON "discount_configs"("academic_year");

-- CreateIndex
CREATE INDEX "idx_discount_configs_estado" ON "discount_configs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uk_discount_configs" ON "discount_configs"("children_quantity", "level", "academic_year");

-- CreateIndex
CREATE INDEX "idx_documents_activo" ON "documents"("status");

-- CreateIndex
CREATE INDEX "idx_documents_fecha_subida" ON "documents"("upload_date");

-- CreateIndex
CREATE INDEX "idx_documents_tipo" ON "documents"("type");

-- CreateIndex
CREATE INDEX "idx_documents_visible_para" ON "documents"("visible_to");

-- CreateIndex
CREATE INDEX "idx_evaluation_structures_año_escolar" ON "evaluation_structures"("academic_year");

-- CreateIndex
CREATE INDEX "idx_evaluation_structures_bimestre" ON "evaluation_structures"("quarter");

-- CreateIndex
CREATE INDEX "idx_evaluation_structures_curso_id" ON "evaluation_structures"("course_id");

-- CreateIndex
CREATE INDEX "idx_evaluation_structures_grado_id" ON "evaluation_structures"("grade_id");

-- CreateIndex
CREATE INDEX "idx_evaluation_structures_sync" ON "evaluation_structures"("course_id", "grade_id", "academic_year_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uk_evaluation_structures_academic_year_id" ON "evaluation_structures"("grade_id", "course_id", "quarter", "academic_year_id", "status");

-- CreateIndex
CREATE INDEX "idx_grades_año_escolar_id" ON "grades"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_grades_estado" ON "grades"("status");

-- CreateIndex
CREATE INDEX "idx_grades_nivel_id" ON "grades"("level_id");

-- CreateIndex
CREATE INDEX "idx_grades_orden" ON "grades"("order");

-- CreateIndex
CREATE INDEX "idx_levels_estado" ON "levels"("status");

-- CreateIndex
CREATE INDEX "idx_levels_orden" ON "levels"("order");

-- CreateIndex
CREATE UNIQUE INDEX "uk_levels_nombre_año" ON "levels"("name", "academic_year_id");

-- CreateIndex
CREATE INDEX "idx_matriculation_estado" ON "matriculation"("status");

-- CreateIndex
CREATE INDEX "idx_matriculation_estudiante_id" ON "matriculation"("student_id");

-- CreateIndex
CREATE INDEX "idx_matriculation_grado_id" ON "matriculation"("grade_id");

-- CreateIndex
CREATE INDEX "idx_matriculation_nivel_id" ON "matriculation"("level_id");

-- CreateIndex
CREATE INDEX "idx_matriculation_seccion_id" ON "matriculation"("section_id");

-- CreateIndex
CREATE INDEX "idx_matriculation_academic_year_level" ON "matriculation"("academic_year_id", "level_id");

-- CreateIndex
CREATE INDEX "idx_matriculation_academic_year_level_status" ON "matriculation"("academic_year_id", "level_id", "status");

-- CreateIndex
CREATE INDEX "idx_matriculation_grade_section_year" ON "matriculation"("grade_id", "section_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "idx_matriculation_status_year" ON "matriculation"("status", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_matriculation_student_academic_year_id" ON "matriculation"("student_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "idx_meeting_attendances_estudiante_id" ON "meeting_attendances"("student_id");

-- CreateIndex
CREATE INDEX "idx_meeting_attendances_user_id" ON "meeting_attendances"("user_id");

-- CreateIndex
CREATE INDEX "idx_meeting_attendances_reunion_id" ON "meeting_attendances"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_meeting_attendances" ON "meeting_attendances"("meeting_id", "user_id", "student_id");

-- CreateIndex
CREATE INDEX "idx_parent_meetings_alcance" ON "parent_meetings"("scope");

-- CreateIndex
CREATE INDEX "idx_parent_meetings_año_escolar" ON "parent_meetings"("academic_year");

-- CreateIndex
CREATE INDEX "idx_parent_meetings_estado" ON "parent_meetings"("status");

-- CreateIndex
CREATE INDEX "idx_parent_meetings_fecha" ON "parent_meetings"("date");

-- CreateIndex
CREATE INDEX "idx_parent_meetings_grado_id" ON "parent_meetings"("grade_id");

-- CreateIndex
CREATE INDEX "idx_parent_meetings_nivel_id" ON "parent_meetings"("level_id");

-- CreateIndex
CREATE INDEX "idx_payment_concepts_año_escolar_id" ON "payment_concepts"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_payment_concepts_estado" ON "payment_concepts"("status");

-- CreateIndex
CREATE INDEX "idx_payment_concepts_tipo" ON "payment_concepts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "idx_payment_intentions_numero_operacion" ON "payment_intentions"("operation_number");

-- CreateIndex
CREATE INDEX "idx_payment_intentions_estado" ON "payment_intentions"("status");

-- CreateIndex
CREATE INDEX "idx_payment_intentions_estudiante_id" ON "payment_intentions"("student_id");

-- CreateIndex
CREATE INDEX "idx_payment_intentions_obligacion_id" ON "payment_intentions"("obligation_id");

-- CreateIndex
CREATE INDEX "idx_payment_intentions_user_id" ON "payment_intentions"("user_id");

-- CreateIndex
CREATE INDEX "idx_payment_methods_estado" ON "payment_methods"("status");

-- CreateIndex
CREATE INDEX "idx_payment_methods_tipo" ON "payment_methods"("type");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_año_escolar" ON "payment_obligations"("academic_year");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_concepto_id" ON "payment_obligations"("concept_id");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_estado" ON "payment_obligations"("status");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_estudiante_id" ON "payment_obligations"("student_id");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_fecha_vencimiento" ON "payment_obligations"("due_date");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_mes_vencimiento" ON "payment_obligations"("due_month");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_concept_year_status" ON "payment_obligations"("concept_id", "academic_year", "status");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_student_year_status" ON "payment_obligations"("student_id", "academic_year", "status");

-- CreateIndex
CREATE INDEX "idx_payment_obligations_year_month_status" ON "payment_obligations"("academic_year", "due_month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uk_payment_obligations" ON "payment_obligations"("student_id", "concept_id", "academic_year", "due_month");

-- CreateIndex
CREATE INDEX "idx_payment_records_concepto_id" ON "payment_records"("concept_id");

-- CreateIndex
CREATE INDEX "idx_payment_records_estado" ON "payment_records"("status");

-- CreateIndex
CREATE INDEX "idx_payment_records_estudiante_id" ON "payment_records"("student_id");

-- CreateIndex
CREATE INDEX "idx_payment_records_obligacion_id" ON "payment_records"("obligation_id");

-- CreateIndex
CREATE INDEX "idx_payment_commitments_user_id" ON "payment_commitments"("user_id");

-- CreateIndex
CREATE INDEX "idx_payment_commitments_año_escolar" ON "payment_commitments"("academic_year");

-- CreateIndex
CREATE INDEX "idx_payment_commitments_estado" ON "payment_commitments"("status");

-- CreateIndex
CREATE INDEX "idx_payment_commitments_fecha_compromiso" ON "payment_commitments"("commitment_date");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "idx_psychological_reports_activo" ON "psychological_reports"("status");

-- CreateIndex
CREATE INDEX "idx_psychological_reports_año_lectivo" ON "psychological_reports"("academic_year");

-- CreateIndex
CREATE INDEX "idx_psychological_reports_estudiante_id" ON "psychological_reports"("student_id");

-- CreateIndex
CREATE INDEX "idx_quarter_averages_año_escolar" ON "quarter_averages"("academic_year");

-- CreateIndex
CREATE INDEX "idx_quarter_averages_bimestre" ON "quarter_averages"("quarter");

-- CreateIndex
CREATE INDEX "idx_quarter_averages_curso_id" ON "quarter_averages"("course_id");

-- CreateIndex
CREATE INDEX "idx_quarter_averages_estudiante_id" ON "quarter_averages"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_quarter_averages" ON "quarter_averages"("student_id", "course_id", "quarter", "academic_year");

-- CreateIndex
CREATE INDEX "idx_read_confirmations_comunicado_id" ON "read_confirmations"("communication_id");

-- CreateIndex
CREATE INDEX "idx_read_confirmations_estado" ON "read_confirmations"("status");

-- CreateIndex
CREATE INDEX "idx_read_confirmations_usuario_id" ON "read_confirmations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_read_confirmations" ON "read_confirmations"("communication_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_report_card_visibility_año_lectivo_id" ON "report_card_visibility"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_report_card_visibility_bimestre" ON "report_card_visibility"("quarter");

-- CreateIndex
CREATE INDEX "idx_report_card_visibility_grado_id" ON "report_card_visibility"("grade_id");

-- CreateIndex
CREATE INDEX "idx_report_card_visibility_nivel_id" ON "report_card_visibility"("level_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_report_card_visibility" ON "report_card_visibility"("academic_year_id", "quarter", "level_id", "grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uk_roles_permissions" ON "roles_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "idx_schedule_images_nivel_id" ON "schedule_images"("level_id");

-- CreateIndex
CREATE INDEX "idx_schedule_images_tipo" ON "schedule_images"("type");

-- CreateIndex
CREATE INDEX "idx_schedule_images_upload_date" ON "schedule_images"("upload_date");

-- CreateIndex
CREATE INDEX "idx_schedules_curso_id" ON "schedules"("course_id");

-- CreateIndex
CREATE INDEX "idx_schedules_dia" ON "schedules"("day");

-- CreateIndex
CREATE INDEX "idx_schedules_grado_id" ON "schedules"("grade_id");

-- CreateIndex
CREATE INDEX "idx_schedules_nivel_id" ON "schedules"("level_id");

-- CreateIndex
CREATE INDEX "idx_schedules_profesor_id" ON "schedules"("teacher_id");

-- CreateIndex
CREATE INDEX "idx_schedules_seccion_id" ON "schedules"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_schedules" ON "schedules"("grade_id", "section_id", "day", "start_time");

-- CreateIndex
CREATE INDEX "idx_sections_año_escolar" ON "sections"("academic_year");

-- CreateIndex
CREATE INDEX "idx_sections_grado_id" ON "sections"("grade_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_sections_grado_nombre_año" ON "sections"("grade_id", "name", "academic_year");

-- CreateIndex
CREATE INDEX "idx_sessions_expires_at" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_sessions_token" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "idx_sessions_user_id" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_student_behaviors_año_escolar" ON "student_behaviors"("academic_year");

-- CreateIndex
CREATE INDEX "idx_student_behaviors_bimestre" ON "student_behaviors"("quarter");

-- CreateIndex
CREATE INDEX "idx_student_behaviors_estudiante_id" ON "student_behaviors"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_student_behaviors" ON "student_behaviors"("student_id", "quarter", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "idx_student_qr_codes_qr_code" ON "student_qr_codes"("qr_code");

-- CreateIndex
CREATE INDEX "idx_student_qr_codes_estudiante_id" ON "student_qr_codes"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_code_key" ON "students"("code");

-- CreateIndex
CREATE UNIQUE INDEX "students_barcode_key" ON "students"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "students_dni_key" ON "students"("dni");

-- CreateIndex
CREATE INDEX "idx_students_año_escolar_id" ON "students"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_students_codigo" ON "students"("code");

-- CreateIndex
CREATE INDEX "idx_students_codigo_barras" ON "students"("barcode");

-- CreateIndex
CREATE INDEX "idx_students_dni" ON "students"("dni");

-- CreateIndex
CREATE INDEX "idx_students_estado" ON "students"("status");

-- CreateIndex
CREATE INDEX "idx_students_full_name" ON "students"("last_names", "first_names");

-- CreateIndex
CREATE INDEX "idx_students_grado_id" ON "students"("grade_id");

-- CreateIndex
CREATE INDEX "idx_students_nivel_id" ON "students"("level_id");

-- CreateIndex
CREATE INDEX "idx_students_seccion_id" ON "students"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_system_settings_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "idx_teacher_assignments_año_escolar" ON "teacher_assignments"("academic_year");

-- CreateIndex
CREATE INDEX "idx_teacher_assignments_curso_id" ON "teacher_assignments"("course_id");

-- CreateIndex
CREATE INDEX "idx_teacher_assignments_grado_id" ON "teacher_assignments"("grade_id");

-- CreateIndex
CREATE INDEX "idx_teacher_assignments_profesor_id" ON "teacher_assignments"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_teacher_assignments" ON "teacher_assignments"("teacher_id", "course_id", "grade_id", "academic_year");

-- CreateIndex
CREATE INDEX "idx_teacher_tasks_completed" ON "teacher_tasks"("completed");

-- CreateIndex
CREATE INDEX "idx_teacher_tasks_teacher_id" ON "teacher_tasks"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE INDEX "idx_users_dni" ON "users"("dni");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_estado" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_users_role_id" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_cqa_academic_year" ON "competency_quarter_averages"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_cqa_category" ON "competency_quarter_averages"("category_id");

-- CreateIndex
CREATE INDEX "idx_cqa_course" ON "competency_quarter_averages"("course_id");

-- CreateIndex
CREATE INDEX "idx_cqa_quarter" ON "competency_quarter_averages"("quarter");

-- CreateIndex
CREATE INDEX "idx_cqa_student" ON "competency_quarter_averages"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_competency_quarter_average" ON "competency_quarter_averages"("student_id", "course_id", "category_id", "quarter", "academic_year_id");

-- AddForeignKey
ALTER TABLE "academic_calendar" ADD CONSTRAINT "fk_academic_calendar_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "fk_academic_years_type" FOREIGN KEY ("type_id") REFERENCES "academic_year_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "fk_attendance_records_justificada_por" FOREIGN KEY ("justified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "fk_attendance_records_registrado_entrada1" FOREIGN KEY ("registered_by_entry1") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "fk_attendance_records_registrado_entrada2" FOREIGN KEY ("registered_by_entry2") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "fk_attendance_records_registrado_salida1" FOREIGN KEY ("registered_by_exit1") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "fk_attendance_records_registrado_salida2" FOREIGN KEY ("registered_by_exit2") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "fk_attendance_records_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_schedules" ADD CONSTRAINT "fk_attendance_schedules_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "fk_announcements_published_by" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "capacities" ADD CONSTRAINT "fk_capacities_competency" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "fk_communications_remitente" FOREIGN KEY ("sender") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "fk_competencies_area" FOREIGN KEY ("academic_area_id") REFERENCES "academic_areas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "fk_competencies_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_averages" ADD CONSTRAINT "fk_competency_averages_course_competency" FOREIGN KEY ("course_competency_id") REFERENCES "course_competencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_averages" ADD CONSTRAINT "fk_competency_averages_curso" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_averages" ADD CONSTRAINT "fk_competency_averages_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_grades" ADD CONSTRAINT "fk_competency_grades_course_competency" FOREIGN KEY ("course_competency_id") REFERENCES "course_competencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_grades" ADD CONSTRAINT "fk_competency_grades_curso" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_grades" ADD CONSTRAINT "fk_competency_grades_profesor" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_grades" ADD CONSTRAINT "fk_competency_grades_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "fk_course_assignments_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "fk_course_assignments_curso" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "fk_course_assignments_grado" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "fk_course_assignments_profesor" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "fk_course_assignments_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "fk_course_competencies_competency" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_competencies" ADD CONSTRAINT "fk_course_competencies_curso" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "fk_courses_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "fk_courses_area" FOREIGN KEY ("academic_area_id") REFERENCES "academic_areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "fk_courses_grade" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "fk_courses_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "fk_documents_subido_por" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_structures" ADD CONSTRAINT "fk_evaluation_structures_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_structures" ADD CONSTRAINT "fk_evaluation_structures_curso" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_structures" ADD CONSTRAINT "fk_evaluation_structures_grado" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_structures" ADD CONSTRAINT "fk_evaluation_structures_profesor" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "fk_grades_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "fk_grades_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "fk_levels_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matriculation" ADD CONSTRAINT "fk_matriculation_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matriculation" ADD CONSTRAINT "fk_matriculation_grade" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matriculation" ADD CONSTRAINT "fk_matriculation_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matriculation" ADD CONSTRAINT "fk_matriculation_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matriculation" ADD CONSTRAINT "fk_matriculation_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meeting_attendances" ADD CONSTRAINT "fk_meeting_attendances_estudiante" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meeting_attendances" ADD CONSTRAINT "fk_meeting_attendances_registrado_por" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meeting_attendances" ADD CONSTRAINT "fk_meeting_attendances_reunion" FOREIGN KEY ("meeting_id") REFERENCES "parent_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meeting_attendances" ADD CONSTRAINT "fk_meeting_attendances_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "fk_parent_meetings_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "fk_parent_meetings_convocada_por" FOREIGN KEY ("convened_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "fk_parent_meetings_grade" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "fk_parent_meetings_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "fk_parent_meetings_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_concepts" ADD CONSTRAINT "fk_payment_concepts_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_intentions" ADD CONSTRAINT "fk_payment_intentions_obligation" FOREIGN KEY ("obligation_id") REFERENCES "payment_obligations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_intentions" ADD CONSTRAINT "fk_payment_intentions_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_intentions" ADD CONSTRAINT "fk_payment_intentions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_obligations" ADD CONSTRAINT "fk_payment_obligations_concepto" FOREIGN KEY ("concept_id") REFERENCES "payment_concepts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_obligations" ADD CONSTRAINT "fk_payment_obligations_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "fk_payment_records_concepto" FOREIGN KEY ("concept_id") REFERENCES "payment_concepts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "fk_payment_records_obligation" FOREIGN KEY ("obligation_id") REFERENCES "payment_obligations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "fk_payment_records_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_commitments" ADD CONSTRAINT "fk_payment_commitments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "psychological_reports" ADD CONSTRAINT "fk_psychological_reports_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "psychological_reports" ADD CONSTRAINT "fk_psychological_reports_subido_por" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quarter_averages" ADD CONSTRAINT "fk_quarter_averages_curso" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quarter_averages" ADD CONSTRAINT "fk_quarter_averages_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "read_confirmations" ADD CONSTRAINT "fk_read_confirmations_comunicado" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "read_confirmations" ADD CONSTRAINT "fk_read_confirmations_usuario" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_card_visibility" ADD CONSTRAINT "fk_report_card_visibility_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_card_visibility" ADD CONSTRAINT "fk_report_card_visibility_autorizado_por" FOREIGN KEY ("authorized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_card_visibility" ADD CONSTRAINT "fk_report_card_visibility_grade" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "report_card_visibility" ADD CONSTRAINT "fk_report_card_visibility_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "fk_roles_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "fk_roles_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_images" ADD CONSTRAINT "fk_schedule_images_grado" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_images" ADD CONSTRAINT "fk_schedule_images_nivel" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_images" ADD CONSTRAINT "fk_schedule_images_profesor" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_images" ADD CONSTRAINT "fk_schedule_images_seccion" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_images" ADD CONSTRAINT "fk_schedule_images_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "fk_schedules_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "fk_schedules_grade" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "fk_schedules_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "fk_schedules_profesor" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "fk_schedules_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "fk_sections_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "fk_sections_grade" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "fk_sections_tutor" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_behaviors" ADD CONSTRAINT "fk_student_behaviors_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_behaviors" ADD CONSTRAINT "fk_student_behaviors_registrado_por" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_behaviors" ADD CONSTRAINT "fk_student_behaviors_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_qr_codes" ADD CONSTRAINT "fk_student_qr_codes_generado_por" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_qr_codes" ADD CONSTRAINT "fk_student_qr_codes_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "fk_students_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "fk_students_grade" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "fk_students_level" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "fk_students_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "fk_teacher_assignments_academic_year" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "fk_teacher_assignments_curso" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "fk_teacher_assignments_grado" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "fk_teacher_assignments_profesor" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teacher_tasks" ADD CONSTRAINT "fk_teacher_tasks_teacher" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_quarter_averages" ADD CONSTRAINT "competency_quarter_averages_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_quarter_averages" ADD CONSTRAINT "competency_quarter_averages_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "competency_quarter_averages" ADD CONSTRAINT "competency_quarter_averages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

